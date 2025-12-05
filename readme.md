

**Project Overview**
- **Repo Root**: app.js — main Express server and Socket.IO setup.
- **Dependencies**: package.json (uses `express`, `ejs`, `mongoose`, `socket.io`, `express-session`, `cookie-parser`, `bcrypt`, `dotenv`, `nodemon`).
- **Models**: User.js, Chat.js — database schemas (MongoDB via Mongoose).
- **Routes**: auth.js, chat.js, friends.js, user.js — HTTP endpoints for authentication, chats, friends, and profile actions.
- **Views**: EJS templates in views (e.g., `homepage.ejs`, `chat.ejs`, `login.ejs`, `signup.ejs`, `profile.ejs`, `editprofile.ejs`, `friendRequests.ejs`, `SEARCHUSER.ejs`, partial `_navbar.ejs`).
- **Public assets**: `public/styles/*.css`, images — static files served by Express.
- **Environment**: `dotenv` loads `process.env.MONGODB_URI` and `process.env.PORT`; sessions configured in app.js.
- **Run**: `npm start` (runs `nodemon app.js`) to start the server.

**Feature List (What the app does)**
- **User Authentication**:  
  - Sign-up (`/auth/signup`): register new users, password hashing (bcrypt expected in `auth.js`).  
  - Login (`/auth/login`): creates session (`express-session`) storing `userId` and `username`.  
  - Logout: session destruction and redirect to login.

- **Session & Middleware**:  
  - Session management via `express-session` with cookie maxAge set (24 hours in app.js).  
  - `res.locals.username` is set from session for view templates (so navbar and pages can show user identity).  
  - Static assets served from public.

- **User Directory / Homepage**:  
  - Root route (`/`) protected: redirects to `/auth/login` if not logged in.  
  - When logged in, fetches all other users (`User.find({ _id: { $ne: req.session.userId } })`) and renders `homepage.ejs`.  
  - Allows searching or navigating to users (search view likely in `SEARCHUSER.ejs`).

- **Profiles**:  
  - View profile (`/user` routes): show user info via profile.ejs.  
  - Edit profile (editprofile.ejs + user.js) to update profile fields and persist to DB.

- **Friends / Relationships**:  
  - Friend requests (`/friends` routes + `friendRequests.ejs`) to send/accept/decline friend requests.  
  - Friends list management (add/remove friends).  
  - friends.js handles friend-related endpoints.

- **Real-time Chat**:  
  - Uses Socket.IO attached to the HTTP server (`io = socketio(server)` in app.js).  
  - Each connected user joins a room named by their `userId` (socket.join(userId)).  
  - Client emits `sendMessage` with `{ sender, receiver, message }`.  
  - Server persists messages to DB via `Chat` model and emits `receiveMessage` to both sender and receiver rooms so both clients update UI.  
  - Chat history persisted in Chat.js and can be loaded when opening chat (chat.js likely queries past messages).

- **Message persistence**:  
  - `Chat` documents saved with sender, receiver, message, and timestamp (timestamp used when emitting back).  
  - Both parties receive message events so UI syncs in real time.

- **Templates & UI**:  
  - EJS templates render server-side pages and partial `_navbar.ejs` included across views.  
  - CSS files in styles control layout and styling (`nav.css`, `styles.css`, `global.css`, `auth.css`).

- **Static file handling**:  
  - Express serves public directory via `app.use(express.static(...))` (twice in app.js, but results same behavior).

**Core Data Flow & Sequence (How things work end-to-end)**
1. Start server: developer runs `npm start` → `nodemon app.js` -> server listens on `process.env.PORT` or 3000.
2. User visits site:  
   - If not logged in, request to `/` redirects to `/auth/login`.  
   - Login POST validated in auth.js. On success, `req.session.userId` and `req.session.username` set, and user redirected to `/`.
3. Homepage: server queries `User` collection for other users and renders homepage.ejs with `users` and `usr` context.
4. Opening Chat: user navigates to chat page (likely `/chat/:id` or a chat view). Client-side JS connects to Socket.IO with `userId` in handshake query. Socket connects to server and joins a room named by `userId`.
5. Sending Message: client emits `sendMessage` -> server receives, creates `Chat` doc via `new Chat({ sender, receiver, message })`, saves it, then does:
   - `io.to(receiver).emit('receiveMessage', { sender, message, timestamp })`
   - `io.to(sender).emit('receiveMessage', {...})`
   - This ensures both sender and receiver get real-time updates.
6. Message history: when the chat page loads, an HTTP endpoint in chat.js fetches past chat documents from `Chat` collection and renders them into `chat.ejs` or returns as JSON to client.
7. Friend actions: user triggers friend request endpoints in friends.js which update `User` documents (e.g., friend lists, pending requests) and then UI refreshes or uses socket/HTTP to show updates.

**Architecture Notes & Key Implementation Points**
- **Socket rooms**: using each user's id as a room isolates message delivery to intended recipients.
- **Session vs socket handshake**: app.js tries `socket.handshake.query.userId || socket.request.session.userId` to find userId. If using session-based socket auth, ensure session middleware is shared with Socket.IO (either by passing a session store or reading cookie on handshake). Current code partly uses handshake query fallback — ensure client sends `userId` on connect.
- **Persistence**: Mongoose models (`User`, `Chat`) handle DB operations. `process.env.MONGODB_URI` must be set (in test.env or .env) for DB connection.
- **Security**: passwords should be hashed (`bcrypt`), sessions secured with a strong `secret` and, in production, `cookie.secure` and proper `sameSite` settings. Avoid storing sensitive info directly in templates.
- **Static duplication**: app.js calls `app.use(express.static(...))` twice — harmless but redundant; can remove one for clarity.
- **Error handling**: routes should use try/catch and return meaningful error responses; app.js uses catch around homepage rendering.

**User Workflows (Step-by-step)**
- New user sign-up:
  - Visit `GET /auth/signup` -> submit form -> `POST /auth/signup` (validate, hash password, create `User` doc) -> set session -> redirect to `/`.
- Login:
  - Visit `GET /auth/login`, submit to `POST /auth/login` -> verify password via `bcrypt.compare` -> set session -> redirect to `/`.
- Browse users & send friend request:
  - On `homepage.ejs`, click "Add Friend" (front-end sends POST to `/friends/request` or similar) -> server updates both users' pending/friends arrays.
- Accept/Decline friend request:
  - Visit `GET /friends/requests` -> accept triggers `/friends/accept` to update both users.
- Open chat:
  - Click a user -> open `chat.ejs` for that user -> client connects to socket.io with `userId` -> load previous messages -> send/receive messages in real time.
- Edit profile:
  - Visit `GET /user/edit` -> change fields -> `POST /user/update` -> server updates `User` doc, redirects to profile.

**Assumptions & Gaps (explicit)**
- Assumed `Chat` model includes `sender`, `receiver`, `message`, `timestamp`. If fields differ, adjust route and socket code accordingly.
- Assumed `auth.js` uses `bcrypt` and sets `req.session.userId` and `req.session.username`. Confirm exact session keys.
- The socket session bridging may require a session-store-compatible approach if authentication should be derived from cookies rather than client-supplied `userId`. Current code allows a handshake `userId` query parameter — ensure the client uses it.
- Database connection requires `MONGODB_URI` in .env or test.env. Ensure .env is present in dev environment.

**Files to Inspect / Edit for Improvements**
- app.js: remove duplicated static middleware; improve socket-session integration; move session secret to env variable.
- auth.js: confirm hashing, session keys, and validation.
- chat.js: ensure chat history endpoints and pagination if needed.
- User.js: verify fields (username, email, passwordHash, friends, friendRequests, avatar).
- Chat.js: verify indexes for querying conversation history efficiently (e.g., compound index on sender and receiver with timestamp).
- `public/js` (if not present): add client socket logic to emit `sendMessage` and listen for `receiveMessage`. If missing, add a client script referenced in `chat.ejs`.

**Next Steps / Recommendations**
- **Quick fixes**: remove duplicate `app.use(express.static(...))` in app.js.
- **Security**: move session `secret` to .env, add HTTPS/secure cookie settings for production.
- **Socket auth**: implement server-side session parsing on Socket.IO handshake or use JWT tokens to authenticate socket connections rather than trusting client `userId`.
- **Persistence**: add indexes on `Chat` for faster conversation queries and add pagination when fetching chat history.
- **UX**: confirm client-side code re-renders messages on `receiveMessage` and handles offline sync (fetch missed messages on reconnect).
- **Dev commands** to run locally:
  - Install deps: `npm install`
  - Run: `npm start` (uses `nodemon app.js`)
  - Ensure .env has `MONGODB_URI` and optionally `PORT`.
