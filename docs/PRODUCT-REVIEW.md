# Royto Social — Product Review

> A hands-on review of the live platform (both personas, all features), based on
> reading the actual UI. Answers three questions: does it achieve its goal, is
> it simple to use, and what should be improved / removed / added.

---

## Verdict up front

**Does it achieve its goal?** The *core* does — genuinely well. The *product around
the core* does not yet, and in two places it actively works against the goal.

**Is it easy and simple to use?** The core loop is simple and close to delightful.
The overall app is **not** simple for the target user (a small Arabic-speaking
shop owner) — it's overloaded, and the "Arabic-first" promise is largely unwired.

The honest one-liner: **you've built an excellent core and buried it inside a
product that's trying to be three products.** The highest-value work now is
*subtraction and follow-through*, not new features.

---

## 1. What's genuinely working — protect this

- **The core loop is the product, and it's strong.** See a message/comment →
  AI drafts a reply grounded in the knowledge base → a confidence score routes
  it (auto-send / review / escalate) → one tap to approve & send. In **Comments**
  the draft is already waiting with one dominant "Approve & Post" button — one
  decision, one tap. This is close to best-in-class for the audience.
- **Resources (the knowledge base) is the sleeper strength.** It's the AI's brain,
  and it even shows a preview of the exact context it feeds the model. This is the
  most important setup page and it's well done.
- **Tone Settings** (per-platform tone/language/blocked words) is the safety knob
  that makes auto-send trustworthy — central and well-placed.
- **Agency Command Center and cross-client Content approval** are the best agency
  pages — genuine, well-designed triage.
- **The UI design system** (buttons, badges, tokens, dark mode) is consistent and
  is the app's best structural asset.

If a redesign happened tomorrow, these are the parts to keep untouched.

---

## 2. Where it falls short of its own promise

### a) Feature sprawl — it's two products in one
The client sees **14 top-level nav items** (plus a 15th, `Automation`, that ships
but isn't even in the nav). The core value is **2 of them** (Inbox, Comments);
the rest dilute it. Several are agency/power-user features sitting in a
shop-owner's navigation: **Flows** (a visual chatbot builder with branching logic
and variables), **Listening** (keyword/brand monitoring), **Team** (seat
management), a 5-tab **Analytics** BI suite, and **Templates**. The app hasn't
decided whether the client is a *self-serve owner* or an *agency-managed account*,
and shows them both — the surest sign of an unfocused surface.

### b) "Arabic-first" is currently a facade
For a product aimed at the KSA/Arabic market, this is the biggest problem:
- Only **4 of 15 client pages** (and **1 agency page**) actually use translations.
  The other ~11 render **hardcoded English**.
- The **navigation labels never translate** — an Arabic user gets an English sidebar.
- **RTL is forced off**: the app hard-sets `dir="ltr"` on every boot, so choosing
  Arabic flips direction but a refresh reverts to LTR, and the sidebar is pinned
  left. The layout never truly mirrors.
- Meanwhile a third language (**Spanish**) is shipped and maintained while Arabic —
  the primary market — isn't fully wired.
- Copy leaks jargon that has no natural Arabic here: "**Escalate/Escalation**,"
  "credential/token," "skip review queue."

The Arabic translations that exist are high quality — the gap is that the pages
don't use them. This is fixable and would do more for the product than any feature.

### c) Trust-eroding gaps and half-wired flows
A small-business owner won't debug these, but they'll *feel* them:
- **Onboarding is a facade past Step 1.** The polished 5-step wizard collects
  platform tokens, the whole knowledge base, and AI tone — then **silently drops
  all of it** on submit (only name/email/platforms are saved). Its final "Test"
  step **fakes success even when the backend fails**. The agency thinks a client
  is fully set up when only a name and an invite link exist.
- **"Act as client" is unsafe on refresh.** Client selection is in-memory only, so
  a page refresh silently un-scopes you *while leaving you on the client's screens*.
  And "Jump in" from the Dashboard/Command Center skips the cache clear, risking
  one client's data showing under another's name.
- **The client permissions panel loads hardcoded defaults** instead of the client's
  real saved permissions — so saving can overwrite real settings with defaults.
- **Analytics is largely mock data** (hardcoded chart series); the agency **Settings**
  "Save Changes" button does nothing; notification prefs live only in the browser.
- **Automation logic is spread across three places** (the orphaned Automation page,
  Flows, and rules inside Tone Settings). No single screen answers the one question
  that matters for trust: *"why did the AI send this reply?"*

### d) Cultural/locale mismatch
The seasonal content library is US-holiday-heavy (Thanksgiving, July 4th, Halloween)
with only two Ramadan/Eid entries, and Automation hardcodes **"Eastern Time"** US
business hours — wrong for a Saudi shop.

---

## 3. Feature-value audit (client persona)

| Feature | Value | Why |
|---|---|---|
| Inbox | **HIGH** | The core job — unified DM triage. |
| Comments | **HIGH** | The original promise; the cleanest expression of the value. |
| Resources (KB) | **HIGH** | Feeds reply quality; the AI's brain. |
| Tone Settings | **HIGH** | Makes auto-send safe. |
| Content | **HIGH** | Scheduling is a top reason shops buy this. |
| Outreach | **MEDIUM** | Real value for promos; still half-renamed from "Campaigns." |
| Contacts | **MEDIUM** | Useful mini-CRM, but overlaps Inbox; don't headline. |
| Analytics | **MEDIUM** | A glance-at, not a daily driver; today mostly mock. |
| Phone (SMS+calls) | **MEDIUM / ?** | Splits the "one inbox" story; many shops won't wire telephony. |
| Templates | **MEDIUM** | Handy but overlaps Resources/Tone; power-user convenience. |
| Team | **LOW** (client) | A 1–2 person shop rarely manages seats. Agency-grade. |
| Flows | **LOW / ?** | Visual bot builder most owners will never touch. |
| Listening | **LOW / ?** | Brand monitoring is an agency/enterprise concern. |
| Automation (page) | **CUT** | Orphaned and redundant with two other surfaces. |

The **agency** IA, by contrast, is tight and appropriate (7 items) — leave it.

---

## 4. Recommendations

### Remove / merge — do this first; this is where the product wins clarity
1. **Consolidate the three automation surfaces into one** and delete the orphaned
   `Automation` page. One place that answers "why did the AI send this?"
2. **Move Flows and Listening out of the default client experience** (agency-only,
   or an "Advanced" tier). They're power-user tools.
3. **Move Team into Settings** (or agency-only).
4. **Merge Phone back into Inbox** as channel tabs — keep the "one inbox" story;
   reconsider whether telephony ships to the small-business tier at all.
5. **Drop Spanish** until Arabic is complete.
6. Net effect: client nav **14 → ~7** (Dashboard, Inbox, Comments, Content,
   Outreach, Analytics, Settings), with Contacts/Resources/Templates as sub-areas.
   That's a shop-owner-sized product.

### Improve / fix — credibility and correctness, in parallel
7. **Make Arabic real:** wire the untranslated pages to the existing translations,
   drive nav labels from i18n keys, and **remove the forced `dir="ltr"`** so RTL
   actually mirrors and persists.
8. **De-jargon the copy:** "Escalate" → "needs your reply," "credential/token" →
   "connect account," and translate the confidence banner.
9. **Fix onboarding** to actually save Steps 2–4 (tokens, knowledge base, tone),
   and make the "Test" step report real success/failure.
10. **Fix "act as client":** persist the selected client across refresh and clear
    the query cache on every jump-in.
11. **Fix the permissions panel** to load the client's real saved permissions.
12. **Replace mock Analytics with real numbers** — or trim it to a 4-KPI strip
    (messages handled, % auto-sent, response time, pending) until the data is real.
13. **Localize content/hours** for the market (Ramadan/Eid library, KSA timezone),
    and add an **Escalated** filter to Comments so the highest-stakes items aren't
    invisible.

### Add / complete — resist net-new; complete what exists
The product needs *less*, not more. The only genuinely missing pieces worth adding:
14. **A "resend/regenerate invite"** on the Clients page (today the invite link is
    a one-shot dead-end).
15. **A client switcher** for the agency (avoid Exit → Clients → reselect).
16. **A billing/plan view** for the agency running many accounts.
17. **First-run that leads with Resources** (the AI's brain) — it's currently
    buried under a "Setup" group at the bottom of the nav.

Everything else labeled "add" should be viewed with suspicion until the surface is
simplified and Arabic/RTL actually work.

---

## 5. Bottom line

The heart of Royto Social — AI-assisted reply moderation grounded in a business's
own knowledge — is real, well-executed, and achieves the goal. What's standing
between it and a product a Saudi shop owner would love isn't more capability; it's
**focus and follow-through**: cut the surface roughly in half, make the Arabic-first
promise true, and finish the flows that currently pretend to work. Do that and the
strong core stops being buried.
