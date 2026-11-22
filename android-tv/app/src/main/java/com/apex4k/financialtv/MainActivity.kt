package com.apex4k.financialtv

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.text.InputType
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import java.io.ByteArrayInputStream
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {

    companion object {
        private const val PREFS_NAME = "apex4k_tv_prefs"
        private const val CUSTOM_URL_KEY = "custom_terminal_url"
        private const val APP_ASSETS_HOST = "appassets.androidplatform.net"
        private const val STANDALONE_BOOT_URL = "https://appassets.androidplatform.net/index.html"
    }

    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private var errorDialogVisible = false

    private val prefs by lazy {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private fun hasBundledWebApp(): Boolean {
        return try {
            assets.list("")?.contains("index.html") == true
        } catch (_: Exception) {
            false
        }
    }

    private fun getDefaultBootUrl(): String {
        return if (hasBundledWebApp()) STANDALONE_BOOT_URL else BuildConfig.TERMINAL_URL
    }

    private fun getActiveTerminalUrl(): String {
        val saved = prefs.getString(CUSTOM_URL_KEY, null)?.trim()
        return if (!saved.isNullOrEmpty()) saved else getDefaultBootUrl()
    }

    private fun saveCustomTerminalUrl(url: String) {
        prefs.edit().putString(CUSTOM_URL_KEY, url.trim()).apply()
    }

    private fun clearCustomTerminalUrl() {
        prefs.edit().remove(CUSTOM_URL_KEY).apply()
    }

    private fun createJsonErrorResponse(statusCode: Int, message: String): WebResourceResponse {
        val safeStatus = if (statusCode in 400..599) statusCode else 502
        val escaped = message.replace("\\", "\\\\").replace("\"", "\\\"")
        val payload = "{\"error\":\"$escaped\"}".toByteArray(Charsets.UTF_8)
        val headers = mapOf(
            "Access-Control-Allow-Origin" to "*",
            "Cache-Control" to "no-store"
        )
        return WebResourceResponse(
            "application/json",
            "UTF-8",
            safeStatus,
            "Error",
            headers,
            ByteArrayInputStream(payload)
        )
    }

    private fun handleNativeFetch(targetUrl: String?): WebResourceResponse {
        if (targetUrl.isNullOrBlank() ||
            (!targetUrl.startsWith("https://") && !targetUrl.startsWith("http://"))
        ) {
            return createJsonErrorResponse(400, "Invalid target URL")
        }

        var conn: HttpURLConnection? = null
        return try {
            val url = URL(targetUrl)
            conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 7000
                readTimeout = 7000
                instanceFollowRedirects = true
                setRequestProperty(
                    "User-Agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
                )
                setRequestProperty(
                    "Accept",
                    "application/json, application/xml, text/xml, text/plain, */*"
                )
            }

            val rawCode = conn.responseCode
            val safeCode = if (rawCode in 100..599) rawCode else 502
            val reason = conn.responseMessage?.takeIf { it.isNotBlank() }
                ?: if (safeCode in 200..299) "OK" else "HTTP $safeCode"

            val rawContentType = conn.contentType ?: "text/plain; charset=UTF-8"
            val parts = rawContentType.split(";").map { it.trim() }
            val mimeType = parts.firstOrNull()?.takeIf { it.isNotEmpty() } ?: "text/plain"
            val charset = parts.drop(1)
                .firstOrNull { it.startsWith("charset=", ignoreCase = true) }
                ?.substringAfter("=")
                ?.trim()
                ?.takeIf { it.isNotEmpty() }
                ?: "UTF-8"

            val stream = if (safeCode >= 400) {
                conn.errorStream ?: conn.inputStream
            } else {
                conn.inputStream ?: conn.errorStream
            }
            val bytes = stream?.use { it.readBytes() } ?: ByteArray(0)

            val headers = mapOf(
                "Access-Control-Allow-Origin" to "*",
                "Cache-Control" to "no-store"
            )

            WebResourceResponse(
                mimeType,
                charset,
                safeCode,
                reason,
                headers,
                ByteArrayInputStream(bytes)
            )
        } catch (ex: Exception) {
            createJsonErrorResponse(502, ex.message ?: "Upstream request failed")
        } finally {
            conn?.disconnect()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep 4K Fire TV display awake for live market monitoring
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        hideSystemUi()

        assetLoader = WebViewAssetLoader.Builder()
            .setDomain(APP_ASSETS_HOST)
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)

        webView = WebView(this).apply {
            setBackgroundColor(0xFF080B11.toInt())
            isFocusable = true
            isFocusableInTouchMode = true
            webChromeClient = WebChromeClient()

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {
                    return false
                }

                override fun shouldInterceptRequest(
                    view: WebView?,
                    request: WebResourceRequest?
                ): WebResourceResponse? {
                    val uri = request?.url ?: return null
                    if (uri.host != APP_ASSETS_HOST) {
                        return super.shouldInterceptRequest(view, request)
                    }

                    val path = uri.path.orEmpty()
                    if (path == "/__native_fetch") {
                        return handleNativeFetch(uri.getQueryParameter("url"))
                    }

                    val normalizedUri = if (path.isEmpty() || path == "/") {
                        uri.buildUpon().path("/index.html").build()
                    } else {
                        uri
                    }

                    val assetResponse = assetLoader.shouldInterceptRequest(normalizedUri)
                    if (assetResponse != null) {
                        return assetResponse
                    }

                    // SPA client-route fallback when path has no file extension
                    val lastSegment = normalizedUri.lastPathSegment.orEmpty()
                    if (!lastSegment.contains(".")) {
                        return assetLoader.shouldInterceptRequest(Uri.parse(STANDALONE_BOOT_URL))
                    }

                    return null
                }

                override fun onReceivedHttpError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    errorResponse: WebResourceResponse?
                ) {
                    super.onReceivedHttpError(view, request, errorResponse)
                    if (request?.isForMainFrame == true) {
                        val code = errorResponse?.statusCode ?: 0
                        if (code >= 400) {
                            runOnUiThread {
                                showServerUrlDialog(
                                    "Server returned HTTP $code for ${request.url}.\n\nSwitch back to Native Bundled mode or enter another live URL below."
                                )
                            }
                        }
                    }
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    super.onReceivedError(view, request, error)
                    if (request?.isForMainFrame == true) {
                        val desc = error?.description?.toString() ?: "Connection error"
                        runOnUiThread {
                            showServerUrlDialog(
                                "Could not reach server ($desc).\n\nSwitch to Native Bundled mode or update the Terminal Server URL below."
                            )
                        }
                    }
                }
            }

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                mediaPlaybackRequiresUserGesture = false
                useWideViewPort = true
                loadWithOverviewMode = true
                allowFileAccess = false
                allowContentAccess = false
                cacheMode = if (hasBundledWebApp()) {
                    WebSettings.LOAD_DEFAULT
                } else {
                    WebSettings.LOAD_NO_CACHE
                }
            }
        }

        cookieManager.setAcceptThirdPartyCookies(webView, true)

        setContentView(webView)
        webView.loadUrl(getActiveTerminalUrl())
        webView.requestFocus()
    }

    private fun showServerUrlDialog(statusMessage: String? = null) {
        if (errorDialogVisible || isFinishing) return
        errorDialogVisible = true

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val pad = (20 * resources.displayMetrics.density).toInt()
            setPadding(pad, pad, pad, pad)
        }

        if (!statusMessage.isNullOrBlank()) {
            val info = TextView(this).apply {
                text = statusMessage
                textSize = 14f
                setPadding(0, 0, 0, (12 * resources.displayMetrics.density).toInt())
            }
            container.addView(info)
        }

        val input = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            val savedCustom = prefs.getString(CUSTOM_URL_KEY, null)?.trim()
            setText(if (!savedCustom.isNullOrEmpty()) savedCustom else BuildConfig.TERMINAL_URL)
            setSelection(text.length)
            hint = "https://your-app-url"
        }
        container.addView(input)

        val defaultModeLabel = if (hasBundledWebApp()) "Use Native Bundled" else "Reset Default"

        AlertDialog.Builder(this)
            .setTitle("Apex 4K TV · Terminal Source")
            .setView(container)
            .setPositiveButton("Load Custom URL") { _, _ ->
                val nextUrl = input.text.toString().trim()
                if (nextUrl.startsWith("http://") || nextUrl.startsWith("https://")) {
                    saveCustomTerminalUrl(nextUrl)
                    webView.loadUrl(nextUrl)
                } else {
                    webView.reload()
                }
            }
            .setNeutralButton(defaultModeLabel) { _, _ ->
                clearCustomTerminalUrl()
                webView.loadUrl(getDefaultBootUrl())
            }
            .setNegativeButton("Reload") { _, _ ->
                webView.loadUrl(getActiveTerminalUrl())
            }
            .setOnDismissListener {
                errorDialogVisible = false
                hideSystemUi()
            }
            .show()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemUi()
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode == KeyEvent.KEYCODE_MENU && event.action == KeyEvent.ACTION_DOWN) {
            val modeText = if (prefs.getString(CUSTOM_URL_KEY, null).isNullOrBlank() && hasBundledWebApp()) {
                "Running in Native Bundled Fire TV mode.\nYou can optionally point to a custom server URL below:"
            } else {
                "Current custom server URL (or switch back to Native Bundled):"
            }
            showServerUrlDialog(modeText)
            return true
        }
        // Back button navigates WebView history or exits cleanly
        if (event.keyCode == KeyEvent.KEYCODE_BACK && event.action == KeyEvent.ACTION_DOWN) {
            if (this::webView.isInitialized && webView.canGoBack()) {
                webView.goBack()
                return true
            }
        }
        return super.dispatchKeyEvent(event)
    }

    @Suppress("DEPRECATION")
    private fun hideSystemUi() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
    }

    override fun onDestroy() {
        if (this::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }
}
