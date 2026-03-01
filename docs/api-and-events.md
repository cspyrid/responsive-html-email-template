# API Endpoints (REST)

- `POST /api/admin/login` `{ password }` -> `{ ok }`
- `POST /api/host/sessions` `{ grade, section, groups[3] }` -> `{ session_id, code, host_pin }`
- `POST /api/host/sessions/:code/start` `{ host_pin }` -> `{ ok }`
- `GET /api/sessions/:code/state` -> session, groups, scoreboard, timer config
- `POST /api/sessions/:code/answer` `{ group_id, question_order_index, selected_choice?, time_ms? }`
- `POST /api/admin/lottery/run` `{ password, rule_type: 'A'|'B' }` -> winner + proof

# WebSocket Events

## Client -> Server
- `session:join` `{ code, role, group_id? }`
- `turn:open` `{ code, question_order_index }`

## Server -> Client
- `session:started` `{ code }`
- `turn:update` `{ question_order_index, active_group_id, time_limit_sec }`
- `scoreboard:update` `{ scoreboard: [{ group_id, name, score }] }`
