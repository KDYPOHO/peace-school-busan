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
        assertEquals(24, context.getApplicationInfo().minSdkVersion);

        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            openDemo(scenario);
            assertEventually(scenario, "Packaged sign-in screen and logo", """
                document.title === '한반도 평화학교' && !!document.querySelector('#authForm') &&
                (document.querySelector('.auth img.signature')?.naturalWidth || 0) > 0
                """);
        }
    }

    @Test
    public void sendsInquiryAndReplyAndKeepsOneCameraPreview() throws InterruptedException {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            openDemo(scenario);
            assertEventually(scenario, "Bundled local demo login", """
                !!document.querySelector('#authForm') && document.body.textContent.includes('체험 모드')
                """);
            evaluate(scenario, """
                (() => {
                  const participant = {uid:'qa_participant',email:'participant@example.invalid'};
                  const staff = {uid:'qa_staff',email:'staff@example.invalid'};
                  sessionStorage.setItem('qaAccounts', JSON.stringify({participant,staff}));
                  localStorage.setItem('psb_demo_v1', JSON.stringify({
                    me:participant, staff:{qa_staff:{label:'시험 운영진'}},
                    users:{qa_participant:{name:'시험 참가자',no:'BS27-QA0001',region:'부산',mode:'onsite',privacyVersion:'2027-01',termsVersion:'2027-01'}},
                    attendance:{}, deepApps:{}, notices:[], questions:[], scores:{}
                  }));
                  location.reload();
                })()
                """);
            assertEventually(scenario, "Participant navigation", "!!document.querySelector('[data-tab=att]')");
            evaluate(scenario, "document.querySelector('[data-view=home] [data-go=att]').click()");
            assertEventually(scenario, "Static participant QR", """
                !!document.querySelector('.qr-pass svg') && !!document.querySelector('#copyEnrollmentNo') && !document.querySelector('.flip') &&
                getComputedStyle(document.body).touchAction === 'manipulation'
                """);
            evaluate(scenario, """
                document.querySelector('#attendanceHelp').click();
                document.querySelector('#helpText').value = '강의 출석을 확인해 주세요.';
                document.querySelector('#helpText').dispatchEvent(new Event('input', {bubbles:true}));
                const send = document.querySelector('#helpForm button');
                send.focus();
                send.click();
                """);
            assertEventually(scenario, "Participant sees sent inquiry and pending state", """
                document.querySelector('main').textContent.includes('답변 대기') &&
                document.querySelector('.inquiry-text')?.textContent === '강의 출석을 확인해 주세요.' &&
                document.querySelector('#helpText').value === '' &&
                !document.querySelector('#helpForm button').disabled
                """);
            switchAccount(scenario, "staff");
            assertEventually(scenario, "Staff dashboard", "!!document.querySelector('[data-tab=noti]')");
            evaluate(scenario, "document.querySelector('[data-tab=noti]').click()");
            assertEventually(scenario, "Staff sees inquiry reply form", "!!document.querySelector('[data-ans]')");
            evaluate(scenario, "document.documentElement.dataset.theme = 'dark'");
            assertEventually(scenario, "Reply editor is readable even in dark mode", """
                getComputedStyle(document.querySelector('[data-ans] textarea')).backgroundColor === 'rgb(255, 255, 255)' &&
                getComputedStyle(document.querySelector('[data-ans] textarea')).color === 'rgb(23, 40, 64)'
                """);
            evaluate(scenario, """
                (() => {
                  const form = document.querySelector('[data-ans]');
                  form.querySelector('textarea').value = '출석 내역을 확인했습니다.';
                  form.requestSubmit();
                })()
                """);
            assertEventually(scenario, "Staff sees answer count", """
                document.querySelector('[data-help-filter=answered]')?.textContent.includes('1건')
                """);
            evaluate(scenario, """
                localStorage.setItem('psb_camNotice','true');
                window.Html5Qrcode = class {
                  constructor(id) { this.host = document.getElementById(id); }
                  async start() { this.host.append(document.createElement('video')); }
                  async stop() { sessionStorage.setItem('qaCameraStopped','yes'); }
                  clear() { this.host.replaceChildren(); }
                };
                document.querySelector('[data-tab=scan]').click();
                document.querySelector('#camBtn').click();
                """);
            assertEventually(scenario, "One visible camera and no animated placeholder", """
                document.querySelectorAll('#reader video').length === 1 &&
                !document.querySelector('#reader').hidden && !document.querySelector('#scanPh') &&
                !document.querySelector('main').classList.contains('enter')
                """);
            evaluate(scenario, """
                document.querySelector('#manualNo').value = 'BS27-QA0001';
                document.querySelector('#manualForm').requestSubmit();
                """);
            assertEventually(scenario, "Manual attendance leaves the camera active", """
                document.querySelector('#scanResult')?.textContent.includes('출석 완료') &&
                document.querySelectorAll('#reader video').length === 1
                """);
            evaluate(scenario, """
                const select = document.querySelector('#scanL');
                select.value = select.value === '1' ? '2' : '1';
                select.dispatchEvent(new Event('change', { bubbles: true }));
                """);
            assertEventually(scenario, "Changing sessions releases the camera and clears the previous result", """
                document.querySelector('#reader').hidden && document.querySelector('#scanResult').hidden &&
                !document.querySelector('#reader video') && sessionStorage.getItem('qaCameraStopped') === 'yes'
                """);
            evaluate(scenario, "document.querySelector('[data-tab=dash]').click()");
            assertEventually(scenario, "Leaving attendance releases the camera", """
                !document.querySelector('#reader') && sessionStorage.getItem('qaCameraStopped') === 'yes'
                """);
            switchAccount(scenario, "participant");
            assertEventually(scenario, "New staff reply appears on participant navigation", """
                document.querySelector('[data-tab=ai]')?.classList.contains('new-reply')
                """);
            evaluate(scenario, "document.querySelector('#bellBtn').click()");
            assertEventually(scenario, "Inbox includes the participant's new reply", """
                document.querySelector('[data-inbox-index]')?.textContent.includes('문의 답변')
                """);
            evaluate(scenario, "document.querySelector('[data-inbox-index]').click()");
            assertEventually(scenario, "Participant sees staff reply", """
                document.querySelector('.inquiry-reply')?.textContent.includes('출석 내역을 확인했습니다.') &&
                !document.querySelector('[data-tab=ai]').classList.contains('new-reply')
                """);
            evaluate(scenario, """
                localStorage.removeItem('psb_demo_v1');
                localStorage.removeItem('psb_camNotice');
                localStorage.removeItem('psb_inquiry_seen_qa_participant');
                sessionStorage.removeItem('qaAccounts');
                sessionStorage.removeItem('qaCameraStopped');
                location.reload();
                """);
        }
    }

    private void openDemo(ActivityScenario<MainActivity> scenario) {
        scenario.onActivity(activity -> {
            var bridge = activity.getBridge();
            bridge.getWebView().loadUrl(bridge.getLocalUrl() + "/?demo=1");
        });
    }

    private void switchAccount(ActivityScenario<MainActivity> scenario, String role)
        throws InterruptedException {
        evaluate(scenario, """
            (() => {
              const data = JSON.parse(localStorage.getItem('psb_demo_v1'));
              data.me = JSON.parse(sessionStorage.getItem('qaAccounts')).%s;
              localStorage.setItem('psb_demo_v1', JSON.stringify(data));
              localStorage.removeItem('psb_role');
              location.reload();
            })()
            """.formatted(role));
    }

    private void assertEventually(ActivityScenario<MainActivity> scenario, String description, String condition)
        throws InterruptedException {
        long deadline = SystemClock.elapsedRealtime() + 30_000;
        do {
            if ("true".equals(evaluate(scenario, "Boolean(" + condition + ")"))) return;
            SystemClock.sleep(250);
        } while (SystemClock.elapsedRealtime() < deadline);
        assertTrue(description, false);
    }

    private String evaluate(ActivityScenario<MainActivity> scenario, String script)
        throws InterruptedException {
        CountDownLatch callback = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(script, response -> {
            value.set(response);
            callback.countDown();
        }));
        assertTrue("WebView JavaScript did not respond", callback.await(5, TimeUnit.SECONDS));
        return value.get();
    }
}
