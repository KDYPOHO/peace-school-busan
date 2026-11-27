package kr.busan.peaceschool;

import static kr.busan.peaceschool.AppLaunchTest.assertEventually;
import static kr.busan.peaceschool.AppLaunchTest.evaluate;
import static org.junit.Assert.assertTrue;

import android.os.Bundle;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class StagingEnrollmentTest {
    @Test
    public void opensCourseOnlyAfterStaffApproval() throws InterruptedException {
        Bundle args = InstrumentationRegistry.getArguments();
        String email = args.getString("fixtureEmail", "");
        String password = args.getString("fixturePassword", "");
        assertTrue("Requires a dedicated staging run", "true".equals(args.getString("stagingFixtures")));
        assertTrue("Requires a synthetic participant", email.endsWith("@example.invalid") && !password.isEmpty());

        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            assertEventually(scenario, "Staging sign-in screen", """
                !!document.querySelector('#authForm') && document.body.textContent.includes('시험용')
                """);
            evaluate(scenario, String.format("""
                document.querySelector('#aEmail').value = %s;
                document.querySelector('#aPw').value = %s;
                document.querySelector('#aBtn').click();
                """, JSONObject.quote(email), JSONObject.quote(password)));
            assertEventually(scenario, "Pending account has a waiting screen and no course navigation", """
                !!document.querySelector('#approvalPending') &&
                document.querySelector('#approvalHeading')?.textContent === '가입 승인 대기' &&
                !document.querySelector('[data-tab]')
                """);

            // The operator approves the synthetic account separately in the staging Firebase project.
            assertEventually(scenario, "Server approval opens course navigation on the same session", """
                !document.querySelector('#approvalPending') && !!document.querySelector('[data-tab=att]')
                """, 100_000);
            evaluate(scenario, "document.querySelector('[data-tab=att]').click()");
            assertEventually(scenario, "Approved participant can open the QR pass", """
                !!document.querySelector('.qr-pass svg') && !!document.querySelector('#copyEnrollmentNo')
                """);
        }
    }
}
