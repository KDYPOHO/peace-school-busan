package kr.busan.peaceschool;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.os.SystemClock;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class AppLaunchTest {
    @Test
    public void rendersBundledLoginAndOfficialSignature() throws InterruptedException {
        var context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("kr.busan.peaceschool", context.getPackageName());
        assertEquals(36, context.getApplicationInfo().targetSdkVersion);

        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            long deadline = SystemClock.elapsedRealtime() + 30_000;
            String result = null;
            while (SystemClock.elapsedRealtime() < deadline && !"true".equals(result)) {
                CountDownLatch callback = new CountDownLatch(1);
                AtomicReference<String> value = new AtomicReference<>();
                scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(
                    "document.title === '평화 학교' && !!document.querySelector('#authForm') && " +
                        "(document.querySelector('.auth img.signature')?.naturalWidth || 0) > 0",
                    response -> {
                        value.set(response);
                        callback.countDown();
                    }
                ));
                assertTrue("WebView JavaScript did not respond", callback.await(5, TimeUnit.SECONDS));
                result = value.get();
                if (!"true".equals(result)) SystemClock.sleep(300);
            }
            assertEquals("The packaged sign-in screen and logo did not render", "true", result);
        }
    }
}
