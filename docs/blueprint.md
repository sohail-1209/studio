# **App Name**: NExCHAT

## Core Features:

- Secure Auth: User authentication: secure signup and login using Firebase Auth.
- Real-Time Feed: Real-time feed: display posts with images/videos and captions, updated in real-time.
- Direct Messaging: Messaging: enable direct, one-to-one text and image messaging.
- User Profiles: Profile Management: Allow users to create and customize their profile. Profiles must allow other users to find and follow each other.
- Firebase Backend: Firebase Integration: Use Firebase for auth, data storage, and hosting.
- Content Creation: Media Upload: Users can upload different types of files when creating content, with a max size of 10MB.
- AI Moderation: Use an AI tool to moderate content in the forms of Images, Videos, or Text based on specified rule-sets.
- Stories: Users can upload temporary stories (image/video with optional caption). Stories auto-expire after 24 hours. Viewable by followers or all users (based on setting)
- Typing indicator: One-to-one messaging using Firestore. Support for text, image, and file attachments. Timestamp, sender info, read status per message.
- Voice and Video Calling: Use WebRTC for peer-to-peer calls. Firebase Firestore or Realtime DB for signaling. UI includes in-chat call buttons and popup modal. Supports both video and voice-only calls
- Notifications: Notify users on: New messages, Likes/comments on their posts, Story views. Store notifications in Firestore; show real-time badge

## Style Guidelines:

- Primary color: #7E57C2 (Indigo) for a calm and trustworthy atmosphere.
- Background color: #F5F0F9 (Light Lavender) for a clean and subtle backdrop.
- Accent color: #F06292 (Pink) to highlight key actions and interactive elements.
- Headline Font: 'Poppins', a geometric sans-serif font, offers a clean and contemporary aesthetic ideal for headlines.
- Body Font: 'PT Sans', a sans-serif that brings both modernity and a touch of warmth.
- Use a set of consistent, modern icons (e.g., Material Design) throughout the app.
- A clean and responsive layout adapts to various screen sizes.
- Subtle animations (using framer-motion) for transitions and user interactions.