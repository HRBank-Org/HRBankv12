# Visual Mockup: Personalized Messaging Agents

## Before vs After

### BEFORE (Generic)
```
┌────────────────────────────────────────┐
│                                        │
│          [Generic Robot Icon]          │
│                                        │
│     Select a conversation to start     │
│            messaging                   │
│                                        │
└────────────────────────────────────────┘
```

### AFTER - Workforce View (Suzie)
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│               ┌──────────────┐                      │
│               │              │ ● (green dot)        │
│               │   [Photo]    │                      │
│               │   Suzie      │                      │
│               └──────────────┘                      │
│                                                     │
│                    Suzie                            │
│                                                     │
│            🛡️ HR Bank Assistant                     │
│                                                     │
│   Good morning! I'm Suzie, your HR Bank            │
│   assistant. I'm here to help you with             │
│   any questions or concerns.                        │
│                                                     │
│   Select a conversation from the left to start      │
│                 messaging                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### AFTER - Employer View (Emma)
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│               ┌──────────────┐                      │
│               │              │ ● (green dot)        │
│               │   [Photo]    │                      │
│               │    Emma      │                      │
│               └──────────────┘                      │
│                                                     │
│                     Emma                            │
│                                                     │
│            🛡️ HR Bank Assistant                     │
│                                                     │
│   Good afternoon! I'm Emma, your HR Bank           │
│   assistant. I'm here to help you manage           │
│   your workforce and answer any questions.          │
│                                                     │
│   Select a conversation from the left to start      │
│                 messaging                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Profile Photo
- **Size:** 96px × 96px circular
- **Border:** Shadow-lg for depth
- **Quality:** Professional stock photography
- **Suzie Photo:** Approachable woman in casual-professional attire
- **Emma Photo:** Professional woman in business attire

### 2. Online Status Indicator
- **Position:** Bottom-right of profile photo
- **Size:** 20px × 20px circle
- **Color:** #10b981 (Green)
- **Border:** 4px white border for contrast
- **Meaning:** Always shows "Online" to indicate availability

### 3. Agent Name
- **Font Size:** 2xl (1.5rem)
- **Font Weight:** Bold
- **Color:** #111827 (Dark Gray)
- **Spacing:** 12px margin below

### 4. Role Badge
- **Background:** Light blue (#eff6ff)
- **Text Color:** Blue (#1d4ed8)
- **Icon:** Shield with checkmark
- **Text:** "HR Bank Assistant"
- **Style:** Rounded pill shape, inline-flex
- **Spacing:** 16px margin below

### 5. Greeting Message
- **Content:** Dynamic based on time and user type
- **Font Size:** Base (1rem)
- **Color:** #4b5563 (Medium Gray)
- **Line Height:** Relaxed (1.625)
- **Max Width:** Medium (28rem)
- **Spacing:** 24px margin below

### 6. Helper Text
- **Content:** "Select a conversation from the left to start messaging"
- **Font Size:** Small (0.875rem)
- **Style:** Italic
- **Color:** #6b7280 (Light Gray)

## Time-Based Greetings

### Morning (12:00 AM - 11:59 AM)
- **Suzie:** "Good morning! I'm Suzie, your HR Bank assistant. I'm here to help you with any questions or concerns."
- **Emma:** "Good morning! I'm Emma, your HR Bank assistant. I'm here to help you manage your workforce and answer any questions."

### Afternoon (12:00 PM - 5:59 PM)
- **Suzie:** "Good afternoon! I'm Suzie, your HR Bank assistant. I'm here to help you with any questions or concerns."
- **Emma:** "Good afternoon! I'm Emma, your HR Bank assistant. I'm here to help you manage your workforce and answer any questions."

### Evening (6:00 PM - 11:59 PM)
- **Suzie:** "Good evening! I'm Suzie, your HR Bank assistant. I'm here to help you with any questions or concerns."
- **Emma:** "Good evening! I'm Emma, your HR Bank assistant. I'm here to help you manage your workforce and answer any questions."

## Full Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ ← [HR Bank Logo] Messages                           [User Menu] │
├─────────────────┬───────────────────────────────────────────────┤
│ Conversations   │                                               │
│ ───────────────│                                               │
│                 │          ┌──────────────┐                     │
│ No messages yet │          │              │ ●                   │
│                 │          │   [Photo]    │                     │
│                 │          │   Suzie/Emma │                     │
│                 │          └──────────────┘                     │
│                 │                                               │
│                 │               Suzie/Emma                      │
│                 │                                               │
│                 │         🛡️ HR Bank Assistant                  │
│                 │                                               │
│                 │   Good [time]! I'm [name], your HR Bank      │
│                 │   assistant. [Role-specific message]          │
│                 │                                               │
│                 │   Select a conversation from the left         │
│                 │   to start messaging                          │
│                 │                                               │
└─────────────────┴───────────────────────────────────────────────┘
```

## Responsive Design

### Desktop (>1024px)
- Full layout as shown above
- Left panel: 33% width (1/3)
- Right panel: 67% width (2/3)

### Tablet (768px - 1024px)
- Same layout with adjusted proportions
- More compact spacing

### Mobile (<768px)
- Stacked layout
- Conversations list appears first
- Clicking a conversation or "no selection" view takes full width
- Agent display remains centered and readable

## Color Palette

| Element | Color | Hex Code |
|---------|-------|----------|
| Online Status | Green | #10b981 |
| Badge Background | Light Blue | #eff6ff |
| Badge Text | Blue | #1d4ed8 |
| Agent Name | Dark Gray | #111827 |
| Greeting Text | Medium Gray | #4b5563 |
| Helper Text | Light Gray | #6b7280 |
| Badge Border | N/A | Transparent |

## Typography Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Agent Name | 2xl (24px) | Bold (700) | 1.2 |
| Badge Text | sm (14px) | Medium (500) | 1.4 |
| Greeting | base (16px) | Normal (400) | 1.625 |
| Helper Text | sm (14px) | Normal (400) | 1.5 |

## Interactions

### Hover States
- None required (static display)

### Click Actions
- Clicking on a conversation in the left panel replaces the agent display with the conversation
- No direct interaction with the agent display itself

### Animation
- None (static content, instant load)
- Future: Could add subtle fade-in animation on mount

## Accessibility

- ✅ **Alt Text:** All images have descriptive alt text
- ✅ **Color Contrast:** All text meets WCAG AA standards
- ✅ **Semantic HTML:** Proper heading hierarchy (h3 for name)
- ✅ **Screen Reader Friendly:** Status indicator has title attribute
- ✅ **Keyboard Navigation:** No keyboard traps

## Agent Personality Guidelines

### Suzie (Workforce Agent)
- **Tone:** Friendly, supportive, approachable
- **Audience:** Casual employees, shift workers
- **Purpose:** Help with shifts, availability, questions
- **Communication Style:** Warm and encouraging

### Emma (Employer Agent)
- **Tone:** Professional, competent, helpful
- **Audience:** Business owners, HR managers
- **Purpose:** Assist with workforce management
- **Communication Style:** Efficient and knowledgeable

## Implementation Notes

- Images load from Unsplash CDN (reliable, fast)
- No external dependencies beyond existing React setup
- Fully responsive using Tailwind CSS classes
- No performance impact (lightweight images, no animations)
- Compatible with all modern browsers
- Dark mode ready (colors can be easily adjusted)
