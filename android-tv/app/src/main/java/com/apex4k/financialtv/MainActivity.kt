package com.apex4k.financialtv

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
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

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var errorDialogVisible = false

    private val prefs by lazy {
        getSharedPreferences("apex4k_tv_prefs", Context.MODE_PRIVATE)
    }

    private fun getActiveTerminalUrl(): String {
        val saved = prefs.getString("terminal_url", null)?.trim()
        return if (!saved.isNullOrEmpty()) saved else BuildConfig.TERMINAL_URL
    }

    private fun saveTerminalUrl(url: String) {
        prefs.edit().putString("terminal_url", url.trim()).apply()
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep 4K Fire TV display awake for live market monitoring
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        hideSystemUi()

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

                override fun onReceivedHttpError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    errorResponse: WebResourceResponse?
                ) {
                    super.onReceivedHttpError(view, request, errorResponse)
                    if (request?.isForMainFrame == true) {
                        val code = errorResponse?.statusCode ?: 0
                        if (code >= 400) {
                            val hint = if (code == 404) {
                                "HTTP 404 (Page not found).\n\nIf you are using the Shared App URL, make sure you clicked Share / Deploy in Google AI Studio so the live server is published, or enter another live/LAN URL below."
                            } else {
                                "Server returned HTTP $code for ${request.url}."
                            }
                            runOnUiThread { showServerUrlDialog(hint) }
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
                            showServerUrlDialog("Could not reach server ($desc).\n\nCheck Wi-Fi or update the Terminal Server URL below.")
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
                // Always fetch latest shell so OTA WebSocket updates apply cleanly
                cacheMode = WebSettings.LOAD_NO_CACHE
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
            setText(getActiveTerminalUrl())
            setSelection(text.length)
            hint = "https://your-app-url"
        }
        container.addView(input)

        AlertDialog.Builder(this)
            .setTitle("Apex 4K TV · Server URL")
            .setView(container)
            .setPositiveButton("Load URL") { _, _ ->
                val nextUrl = input.text.toString().trim()
                if (nextUrl.startsWith("http://") || nextUrl.startsWith("https://")) {
                    saveTerminalUrl(nextUrl)
                    webView.loadUrl(nextUrl)
                } else {
                    webView.reload()
                }
            }
            .setNeutralButton("Reset Default") { _, _ ->
                prefs.edit().remove("terminal_url").apply()
                webView.loadUrl(BuildConfig.TERMINAL_URL)
            }
            .setNegativeButton("Retry") { _, _ ->
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
            showServerUrlDialog("Current terminal URL (edit or reload):")
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
