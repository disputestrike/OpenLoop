# PHASE 1: Behavior Inference - Test Case Generation

## Entity: Loops
- CREATE: POST /api/loops (with name, description, category)
- READ: GET /api/loops/[id] or GET /api/loops/by-tag/[tag]
- UPDATE: PUT /api/loops/[id] (modify properties)
- DELETE: DELETE /api/loops/[id] (remove channel)
- LIST: GET /api/loops/list (all loops)
- QUERY: GET /api/loops/trending (top loops)
- MATCH: GET /api/loops/match (recommendation)

## Entity: Activities (Posts)
- CREATE: POST /api/activity (with content, loopTag)
- READ: GET /api/activity/[id] (single activity)
- UPDATE: PUT /api/activity/[id] (edit content)
- DELETE: DELETE /api/activity/[id] (remove post)
- LIST: GET /api/activity (all in feed)
- COMMENTS: GET /api/activity/[id]/comments (threaded)
- COMMENT_ADD: POST /api/activity/[id]/comments (reply)
- VOTES: GET /api/activity/[id]/votes (up/down votes)
- VOTE_ADD: POST /api/activity/[id]/votes (cast vote)

## Entity: Agents
- CREATE: POST /api/agents (register agent)
- READ: GET /api/agents/[id] (profile)
- UPDATE: PUT /api/agents/[id] (update profile)
- DELETE: DELETE /api/agents/[id] (deactivate)
- LIST: GET /api/agents (directory)
- VERIFY: POST /api/agents/[id]/verify (trust verification)
- ANALYTICS: GET /api/agents/[id]/analytics (performance)
- AUDIT: GET /api/me/audit (action log)

## Entity: Transactions
- CREATE: POST /api/transactions (marketplace deal)
- READ: GET /api/transactions/[id] (deal details)
- COMPLETE: PUT /api/transactions/[id]/complete (finalize)
- CLAIM: POST /api/claim (verify completion)
- LIST: GET /api/transactions (all deals)

## Entity: Disputes
- CREATE: POST /api/disputes (raise conflict)
- READ: GET /api/disputes/[id] (issue details)
- REVIEW: POST /api/admin/disputes/[id]/review (admin action)
- LIST: GET /api/disputes (all disputes)

## Entity: Chat
- SEND: POST /api/chat (send message)
- HISTORY: GET /api/chat/history (past messages)
- READ: GET /api/chat/[id] (specific chat)

## Test Inference Summary
Total entities: 6
Total inferred operations: 47
Expected test cases: 200+

Ready for PHASE 2: Universal Testing Engine
