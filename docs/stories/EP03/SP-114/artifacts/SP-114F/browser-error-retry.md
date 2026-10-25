# SP-114F browser error/retry evidence (IR-114-03)

**Date:** 2026-10-24 21:47 EDT  
**Executor:** implementer, headless Google Chrome 155.0.8059.85 (`--headless=new`), viewport 1280x800.  
**Environment:** running local web `http://localhost:3000` (Vite in this workspace, serving the IR-114-01/02 source) proxied to the running API `http://127.0.0.1:4000`. No `.env` file was read.  
**Tested Git state:** HEAD was `fb95e06` plus the uncommitted E keyboard/announcement fixes that Vite was serving. Those fixes were then committed as `5b1f33b`. This walk was not repeated after that commit; the served source matches it.  
**Account:** synthetic `sp114-fix-1792892856257@studypilot-test.invalid` on the running dev database. Password and tokens were not recorded.  
**Machine record:** [observations.json](./browser-evidence/observations.json) (12/12 `ok: true`). Screenshots are beside it.

Previously recorded happy-path checks (course header, edit hints, description clearing, delete cancel, single delete, idle keyboard, mobile 390x844) were not repeated. Their abbreviated REA ids remain historical and are not treated as this pass's evidence.

| Check | Actions | Observed result | Evidence |
|---|---|---|---|
| Edit field error | Open Edit, clear Title, Save changes | Dialog stays open, title stays empty, text `Title is required`, page status is not `Assignment updated.` | [02-edit-field-error.png](./browser-evidence/02-edit-field-error.png) |
| Edit HTTP 500 | Change title to `Retry Edit revised`; browser fulfills that PATCH as 500 | Toast `We could not save the assignment. Try again.`; title preserved; Save enabled (`disabled === false`); status stays empty | [03-edit-500.png](./browser-evidence/03-edit-500.png) |
| Edit 500 retry | Save changes again with interception off | Dialog closes; page live region (`[role="status"].min-h-5`) is `Assignment updated.` | [04-edit-500-retry.png](./browser-evidence/04-edit-500-retry.png) |
| Edit network failure | After the previous error toast dismissed, edit again, fail the PATCH at the network layer | Same retry toast; title `Retry Edit network` preserved; Save enabled; status empty (no success announcement) | [05-edit-network.png](./browser-evidence/05-edit-network.png) |
| Edit network retry | Save changes again | Dialog closes; live region `Assignment updated.` | [06-edit-network-retry.png](./browser-evidence/06-edit-network-retry.png) |
| Edit 404 | Open Edit on `Missing Edit`, delete that assignment through the API, type a new title, Save | Inline alert `Resource not found — this course or assignment may no longer exist.` plus `Back to courses`; typed title preserved; no success announcement | [07-edit-404.png](./browser-evidence/07-edit-404.png) |
| Delete HTTP 500 | Confirm delete; browser fulfills DELETE as 500 with message `Internal server error` | Inline alert `Internal server error`; Cancel and Delete both enabled; status is not `Assignment deleted.` | [08-delete-500.png](./browser-evidence/08-delete-500.png) |
| Delete retry | Confirm delete again | Dialog closes; live region `Assignment deleted.` | [09-delete-retry.png](./browser-evidence/09-delete-retry.png) |
| Pending delete keyboard (IR-114-01) | Tab onto Delete (`keyboardFocusOnDeleteBeforeActivate: true`), hold the DELETE, then CDP Tab, Shift+Tab, and Escape. Focus was also moved to the Courses link and Tab was pressed again | Focus stayed on the dialog (`inDialog: true`, `role=dialog`) for Tab, Shift+Tab, and the pull-back. Escape left `Delete First Announce?` open. One DELETE stayed paused until released, then the live region became `Assignment deleted.` | [10-pending-delete-keyboard.png](./browser-evidence/10-pending-delete-keyboard.png) |
| Consecutive announcements (IR-114-02) | After the first success, open Delete on the second assignment, then confirm | Opening cleared the page live region to empty. Confirming set `Assignment deleted.` again on that same region | [11-consecutive-delete.png](./browser-evidence/11-consecutive-delete.png) |

Limitation: CDP `Enter` did not by itself start the held DELETE after Tab had focused that button, so the script activated the already-focused Delete control. The Tab, Shift+Tab, Escape, and outside-focus pull-back that follow were real key events while the request was paused. No success toast is used for assignment save or delete; a lingering error toast can remain visible after a later success and is not success feedback.
