package kr.busan.peaceschool;

import static kr.busan.peaceschool.AppLaunchTest.assertEventually;
import static kr.busan.peaceschool.AppLaunchTest.evaluate;
import static org.junit.Assert.assertTrue;
import static org.junit.Assume.assumeTrue;

import android.os.Bundle;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class StagingJourneyTest {
    @Test
    public void readsAttendanceAndReplyFromMacAndSendsAnInquiry() throws InterruptedException {
        Bundle args = InstrumentationRegistry.getArguments();
        assumeTrue("Requires stagingFixtures=true and synthetic account arguments",
            "true".equals(args.getString("stagingFixtures")));
        String email = args.getString("fixtureEmail", "");
        String password = args.getString("fixturePassword", "");
        String macQuestion = args.getString("macQuestion", "");
        String question = args.getString("androidQuestion", "");
        assertTrue("Synthetic account credentials required", email.endsWith("@example.invalid") && !password.isEmpty());
        assertTrue("Staging inquiry fixtures required", macQuestion.matches("[A-Za-z0-9_-]+") && !question.trim().isEmpty());

        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            assertEventually(scenario, "Staging sign-in screen", """
                !!document.querySelector('#authForm') && document.body.textContent.includes('시험용')
                """);
            evaluate(scenario, String.format("""
                document.querySelector('#aEmail').value = %s;
                document.querySelector('#aPw').value = %s;
                document.querySelector('#aBtn').click();
                """, JSONObject.quote(email), JSONObject.quote(password)));
            assertEventually(scenario, "Participant signs into Firebase", "!!document.querySelector('[data-tab=att]')");
            evaluate(scenario, "document.querySelector('[data-tab=att]').click()");
            assertEventually(scenario, "QR and first-session attendance from Mac are visible", """
                !!document.querySelector('.qr-pass svg') && !!document.querySelector('#copyEnrollmentNo') &&
                !!document.querySelector('.dot.done[title="1강"]')
                """);
            evaluate(scenario, "document.querySelector('#attendanceHelp').click()");
            String reply = "document.getElementById(" + JSONObject.quote("reply-" + macQuestion) + ")";
            assertEventually(scenario, "Mac inquiry has a saved staff reply", String.format("""
                %s?.querySelector('.inquiry-reply .inquiry-text')?.textContent.trim().length > 0
                """, reply));
            evaluate(scenario, String.format("""
                (() => {
                  const field = document.querySelector('#helpText');
                  field.value = %s;
                  field.dispatchEvent(new Event('input', {bubbles: true}));
                  document.querySelector('#helpForm button').click();
                })()
                """, JSONObject.quote(question)));
            assertEventually(scenario, "Android inquiry is saved and visible as pending", String.format("""
                document.querySelector('#helpText')?.value === '' &&
                Array.from(document.querySelectorAll('article[id^="reply-"]')).some(article =>
                    article.querySelector('.inquiry-text').textContent === %s &&
                    article.querySelector('.p-mute')?.textContent === '답변 대기')
                """, JSONObject.quote(question)));
        }
    }
}
