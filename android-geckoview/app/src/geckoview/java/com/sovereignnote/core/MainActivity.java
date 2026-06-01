package com.sovereignnote.core;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import org.mozilla.geckoview.GeckoRuntime;
import org.mozilla.geckoview.GeckoSession;
import org.mozilla.geckoview.GeckoView;

public class MainActivity extends AppCompatActivity {
    private GeckoView mGeckoView;
    private GeckoSession mSession;
    private GeckoRuntime mRuntime;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        mGeckoView = findViewById(R.id.geckoview);
        mSession = new GeckoSession();
        mRuntime = GeckoRuntime.create(this);

        mSession.open(mRuntime);
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
