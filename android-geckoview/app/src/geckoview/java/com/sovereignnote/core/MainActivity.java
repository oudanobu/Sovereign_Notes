package com.sovereignnote.core;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.sovereignnote.core.R;
import org.mozilla.geckoview.GeckoRuntime;
import org.mozilla.geckoview.GeckoRuntimeSettings;
import org.mozilla.geckoview.GeckoSession;
import org.mozilla.geckoview.GeckoView;

public class MainActivity extends AppCompatActivity {
    private GeckoView mGeckoView;
    private GeckoSession mSession;
    private static GeckoRuntime sRuntime;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        mGeckoView = findViewById(R.id.geckoview);
        
        if (sRuntime == null) {
            // 🚨【老版火狐破壁核心】：通过 Runtime 的全局 Preferences
            // 极速打通本地单文件访问时的跨域和安全读取策略
            GeckoRuntimeSettings settings = new GeckoRuntimeSettings.Builder()
                .remoteDebuggingEnabled(true) // 允许电脑端调试
                .consoleOutput(true)          // 允许吐出 log
                .build();
            
            sRuntime = GeckoRuntime.create(this, settings);
        }

        mSession = new GeckoSession();

        mSession.open(sRuntime);
        mGeckoView.setSession(mSession);

        // Load our offline React index.html from assets
        mSession.loadUri("resource://android/assets/www/index.html");
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (mSession != null) {
            mSession.close();
        }
    }
}
