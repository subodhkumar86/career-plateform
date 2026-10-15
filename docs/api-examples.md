# API examples

Register:
```http
POST /api/auth/register
Content-Type: application/json

{"name":"Candidate","email":"candidate@example.com","password":"replace-with-strong-password"}
```

Create a chat:
```http
POST /api/chat/sessions
Authorization: Bearer <JWT>
Content-Type: application/json

{"title":"Interview preparation"}
```

Send a chat message:
```http
POST /api/ai/sessions/<sessionId>/messages
Authorization: Bearer <JWT>
Content-Type: application/json

{"content":"Help me prepare for a Node.js interview"}
```

Create resume:
```http
POST /api/resumes
Authorization: Bearer <JWT>
Content-Type: application/json

{"title":"Full Stack Developer Resume","template":"ats","content":{"personalInfo":{"name":"Candidate"},"skills":["TypeScript","Node.js"]}}
```

Booking query:
`GET /api/bookings?page=1&limit=10&status=CONFIRMED&search=Candidate&sort=-createdAt`

See `/api-docs` for interactive OpenAPI documentation.
