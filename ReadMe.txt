# ReflectiBot API

ReflectiBot is a modular, voice-enabled AI companion system built on Express and OpenAI. This README outlines the current architecture and how to work with the new modular route/controller setup.

---

## 📁 Project Structure

```
/server
  /src
    /controllers     # Route logic and request handling
    /routes          # Route definitions
    /services        # Business logic (e.g. style, memory, DB)
    /utils           # Helpers (prompt generation, formatting)
    /storage.ts      # DB abstraction
    index.ts         # Server entry point
```

---

## ✅ Current API Routes

| Method | Endpoint              | Description                         |
|--------|-----------------------|-------------------------------------|
| POST   | `/api/chat`           | Submits a message to ReflectiBot    |
| POST   | `/api/tts`            | Converts text to speech             |
| POST   | `/api/text-to-speech` | Alias for `/tts`                    |
| POST   | `/api/transcribe`     | Transcribes uploaded voice file     |
| GET    | `/api/stats`          | Returns bot's word/memory stats     |
| POST   | `/api/user/switch`    | Switches to a new bot persona       |
| GET    | `/api/test-openai`    | Confirms OpenAI API connectivity    |

---

## 🧠 Architecture Philosophy

- **Controllers**: Pure logic for handling requests and responses
- **Routes**: Mountable Express routers for clean separation
- **Services**: Reusable business logic (e.g. personality reflection)
- **Storage**: Single interface for DB calls
- **Utils**: Helper logic and prompt generators

---

## 🛠 Setup & Run

```bash
npm install
npm run build
npm start
```

---

## ✨ Contributing
- Add routes to `/routes/<name>.ts`
- Place logic in `/controllers/<name>Controller.ts`
- Use service files for shared AI logic

---

## 🔒 Secrets
Set the following environment variables:

```env
OPENAI_API_KEY=your-openai-key
ELEVENLABS_API_KEY=your-elevenlabs-key
```

---

## 🚧 Roadmap
- [ ] Add unit tests for controllers
- [ ] Add Swagger/OpenAPI docs
- [ ] Add persistent user memory
- [ ] Deploy to production

---

Built for scale, flexibility, and voice-based AI interaction.
