<div align="center">

# SonicFlow

### `Transform. Remix. Experience Sound.`

<img src="./assets/sonicflow-hero.svg" alt="SonicFlow Animated Hero" width="900"/>

<br/>

[![Live Demo](https://img.shields.io/badge/Live%20Demo-SonicFlow-black?style=for-the-badge\&logo=render)](https://sonicflow-sc0u.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-Source%20Code-black?style=for-the-badge\&logo=github)](https://github.com/TheHUNTER2714/SonicFlow)
[![Watch Reel](https://img.shields.io/badge/Watch-Promotional%20Reel-black?style=for-the-badge\&logo=youtube)](https://ireel.today/v/b6d86cd724)

<br/>

<img src="https://readme-typing-svg.demolab.com?font=Space+Grotesk&weight=600&size=25&duration=2800&pause=900&color=FFFFFF&center=true&vCenter=true&width=700&lines=YouTube+to+MP3+%2F+MP4;Original+Audio+%7C+8D+%7C+16D;Powered+by+FFmpeg+%2B+yt-dlp;A+New+Way+to+Experience+Sound" alt="SonicFlow typing animation"/>

</div>

---

# SonicFlow

**SonicFlow** is a modern web-based media transformation platform designed to turn YouTube content into downloadable audio and video experiences.

Instead of treating conversion as a simple download operation, SonicFlow focuses on the **entire listening experience**.

Convert videos into:

* MP3 audio
* MP4 video
* Original audio
* 8D spatial audio
* 16D spatial audio

The interface combines a minimal dark visual system with animated transitions, waveform-inspired motion, glowing audio rings, particle effects and responsive interaction states.

---

# Promotional Reel

<div align="center">

### See SonicFlow in action.

<a href="https://ireel.today/v/b6d86cd724">

<img src="./assets/sonicflow-reel-cover.svg" alt="Watch SonicFlow Promotional Reel" width="850"/>

</a>

<br/>

**▶ Watch the SonicFlow Promotional Reel**

[Open Promotional Reel](https://ireel.today/v/b6d86cd724)

</div>

> The reel demonstrates the product experience and visual direction of SonicFlow.

---

# The Experience

SonicFlow is designed around a simple flow:

```text
Paste YouTube URL
        ↓
     Analyze
        ↓
   Select Format
        ↓
 Select Audio Mode
        ↓
   Process Media
        ↓
 Download Result
```

The interface visually communicates every stage instead of leaving the user wondering what is happening.

---

# Animated Visual System

The visual language of SonicFlow is inspired by animated SVG interfaces where every major element has a purpose and movement is used to communicate interaction.

### Hero Animation

The hero section can include:

* Animated SonicFlow logo
* Pulsing sound rings
* Moving waveform
* Floating particles
* Ambient background glow
* Typing headline
* Animated underline
* Staggered feature appearance
* Smooth CTA entrance

Example animation sequence:

```text
        ┌───────────────┐
        │  SonicFlow    │
        └───────┬───────┘
                │
       ~~~~~~~~ ● ~~~~~~~~
          ~~~~  │  ~~~~
        ~~~     │     ~~~
               ↓
          Audio Motion
               ↓
        8D → 16D → Spatial
```

---

## Animation Principles

### 01 — Pulse

Audio-related elements continuously breathe using subtle scale animation.

```css
@keyframes sonic-pulse {
  0% {
    transform: scale(1);
    opacity: 0.65;
  }

  50% {
    transform: scale(1.08);
    opacity: 1;
  }

  100% {
    transform: scale(1);
    opacity: 0.65;
  }
}
```

---

### 02 — Wave

Waveform elements continuously move horizontally.

```css
@keyframes sonic-wave {
  0% {
    transform: translateX(0);
  }

  50% {
    transform: translateX(-12px);
  }

  100% {
    transform: translateX(0);
  }
}
```

---

### 03 — Floating

Small particles and decorative elements gently move through the interface.

```css
@keyframes sonic-float {
  0% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-14px);
  }

  100% {
    transform: translateY(0);
  }
}
```

---

### 04 — Reveal

Sections and cards appear progressively.

```css
@keyframes sonic-pop {
  from {
    opacity: 0;
    transform: translateY(24px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

### 05 — Wipe

Underlines and accent elements reveal themselves horizontally.

```css
@keyframes sonic-wipe {
  from {
    transform: scaleX(0);
  }

  to {
    transform: scaleX(1);
  }
}
```

---

# Audio Modes

SonicFlow supports multiple listening experiences.

| Mode     | Description                                         |
| -------- | --------------------------------------------------- |
| Original | Extract the source audio without spatial processing |
| 8D       | Creates a noticeable left-right spatial movement    |
| 16D      | Uses a more pronounced spatial movement effect      |
| MP3      | Audio-only downloadable format                      |
| MP4      | Video downloadable format                           |

---

# 8D Audio

The 8D mode uses FFmpeg processing to create a continuously moving stereo experience.

Conceptually:

```text
LEFT
  ●
   \
    \
     ●
      \
       \
        ●
       /
      /
     ●
    /
   /
RIGHT
```

Example FFmpeg filter:

```bash
apulsator=mode=sine:hz=0.16:amount=0.95
```

The effect creates a periodic stereo movement rather than simply changing the volume.

---

# 16D Audio

The 16D mode increases the movement rate and modulation depth.

```bash
apulsator=mode=sine:hz=0.32:amount=0.98
```

Conceptually:

```text
L → R → L → R → L
      ↘   ↗
       ↘ ↗
        CENTER
       ↗   ↘
      R     L
```

The processing is performed through FFmpeg before the resulting audio is delivered.

---

# Animated Processing Pipeline

The conversion process can be represented visually as a moving pipeline:

```text
[ URL ]
   │
   ●
   │
[ ANALYZE ]
   │
   ●
   │
[ EXTRACT ]
   │
   ●
   │
[ PROCESS ]
   │
   ●
   │
[ EXPORT ]
   │
   ●
   │
[ DOWNLOAD ]
```

The connecting points can be animated to communicate active processing.

Example:

```css
@keyframes pipeline-flow {
  0% {
    transform: translateY(-20px);
    opacity: 0;
  }

  50% {
    opacity: 1;
  }

  100% {
    transform: translateY(20px);
    opacity: 0;
  }
}
```

---

# Features

### Media Conversion

* YouTube URL processing
* MP3 extraction
* MP4 downloading
* Original audio extraction
* FFmpeg-based media processing

### Spatial Audio

* 8D audio
* 16D audio
* Stereo movement
* Adjustable processing pipeline

### Modern Interface

* Dark premium interface
* Space Grotesk typography
* Glass-inspired components
* Animated waveform elements
* Particle backgrounds
* Smooth transitions
* Loading states
* Progress feedback
* Responsive layout

### User Experience

* Paste URL
* Analyze media
* Choose output
* Select audio mode
* Process
* Download

---

# Interface Direction

The interface follows a **minimal cinematic audio aesthetic**.

```text
┌────────────────────────────────────────────────────┐
│                                                    │
│                     SonicFlow                      │
│                                                    │
│              Transform Your Sound                 │
│                                                    │
│       ┌──────────────────────────────────┐        │
│       │ Paste YouTube URL                 │        │
│       └──────────────────────────────────┘        │
│                                                    │
│       [ MP3 ] [ MP4 ] [ 8D ] [ 16D ]             │
│                                                    │
│                 [ PROCESS ]                        │
│                                                    │
│             ~~~~~ WAVEFORM ~~~~~                  │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

# Typography

The primary interface uses **Space Grotesk**.

The typography system focuses on:

* Strong geometric headings
* High readability
* Large hero typography
* Minimal text density
* Animated text reveals
* Typing effects for promotional messaging

Example:

```text
SonicFlow
Transform.
Remix.
Experience.
Sound.
```

---

# Technology Stack

## Frontend

* HTML
* CSS
* JavaScript
* Tailwind CSS
* Framer Motion
* Responsive UI
* SVG animation

## Backend

* Node.js
* Express
* REST API
* yt-dlp
* FFmpeg

## Media Processing

* yt-dlp
* FFmpeg
* MPEG audio processing
* Stereo spatial effects

## Deployment

* Render
* Netlify

---

# Architecture

```text
                    ┌───────────────────┐
                    │     Browser       │
                    │                   │
                    │ SonicFlow UI      │
                    │ Animations        │
                    │ Audio Controls    │
                    └─────────┬─────────┘
                              │
                              │ HTTP
                              ▼
                    ┌───────────────────┐
                    │   Express Server  │
                    │                   │
                    │ URL Processing     │
                    │ Media Pipeline     │
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
              ┌──────────┐       ┌──────────┐
              │  yt-dlp  │       │  FFmpeg  │
              │          │       │          │
              │ Extract  │──────▶│ Process  │
              │ Media    │       │ Audio    │
              └──────────┘       └────┬─────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │ Downloadable │
                               │    Output    │
                               └──────────────┘
```

---

# Processing Pipeline

```text
YouTube URL
    │
    ▼
Validate URL
    │
    ▼
Resolve Media
    │
    ▼
yt-dlp
    │
    ├───────────────┐
    ▼               ▼
   Audio           Video
    │               │
    ▼               ▼
 FFmpeg          FFmpeg
    │               │
    ├───────┬───────┘
    ▼       ▼
 Original  Spatial
           Audio
             │
          8D / 16D
             │
             ▼
          Export
             │
             ▼
          Download
```

---

# API

### `GET /`

Returns the SonicFlow application.

### `POST /resolve-audio`

Processes the requested media URL and prepares the selected audio output.

Example request:

```json
{
  "url": "https://www.youtube.com/watch?v=example",
  "mode": "8d"
}
```

Possible processing modes:

```text
original
8d
16d
```

---

# Project Structure

```text
SonicFlow/
│
├── assets/
│   ├── sonicflow-hero.svg
│   ├── sonicflow-reel-cover.svg
│   └── ...
│
├── public/
│   └── ...
│
├── server.js
├── package.json
├── package-lock.json
├── README.md
└── ...
```

---

# Running Locally

Clone the repository:

```bash
git clone https://github.com/TheHUNTER2714/SonicFlow.git
```

Enter the project:

```bash
cd SonicFlow
```

Install dependencies:

```bash
npm install
```

Start the server:

```bash
node server.js
```

Open:

```text
http://localhost:10000
```

---

# Environment Configuration

For local development, configure the required media-processing paths and runtime variables according to your environment.

Example:

```env
PORT=10000
```

Make sure the required binaries are available:

```text
Node.js
yt-dlp
FFmpeg
```

---

# Deployment

SonicFlow can be deployed using a frontend/backend split.

```text
Frontend
   │
   ▼
Netlify
   │
   │ API Requests
   ▼
Backend
   │
   ▼
Render
   │
   ├── yt-dlp
   └── FFmpeg
```

Recommended production configuration:

```text
Frontend → Netlify
Backend  → Render
Media    → yt-dlp + FFmpeg
```

---

# UX States

SonicFlow should clearly communicate every state.

### Idle

```text
Paste a YouTube URL
```

### Analyzing

```text
Analyzing media...
```

### Processing

```text
Processing audio...
```

### Spatial Processing

```text
Creating 8D experience...
```

or:

```text
Creating 16D experience...
```

### Ready

```text
Your file is ready.
```

### Error

```text
Something went wrong.
Please check the URL and try again.
```

Animated transitions should be used between these states rather than abruptly replacing the UI.

---

# Design System

### Primary Style

```text
Dark
Minimal
Cinematic
Audio-focused
High contrast
Motion-driven
```

### Visual Elements

* Soft glows
* Circular audio rings
* Thin borders
* Glass surfaces
* Animated SVG
* Waveforms
* Particles
* Large typography
* Micro-interactions

### Motion

Animations should generally be:

```text
Fast → interactions
Medium → component transitions
Slow → ambient background
```

This keeps the interface energetic without becoming distracting.

---

# Responsive Design

SonicFlow is designed for:

```text
Desktop
Tablet
Mobile
```

Responsive behavior should preserve the primary interaction:

```text
URL
 ↓
Format
 ↓
Audio Mode
 ↓
Process
 ↓
Download
```

On mobile, large decorative animations should scale down while maintaining the same visual identity.

---

# Accessibility

The interface should maintain:

* Keyboard navigation
* Visible focus states
* Sufficient contrast
* Accessible button labels
* Reduced-motion support
* Screen-reader-friendly controls

For users who prefer reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

# Performance

Animations should remain lightweight.

Recommended techniques:

* Prefer CSS transforms
* Animate `transform` and `opacity`
* Avoid expensive layout recalculation
* Lazy-load promotional media
* Compress SVG assets
* Avoid excessive DOM particles
* Cache reusable media when appropriate
* Keep FFmpeg processing server-side

---

# Error Handling

The application should gracefully handle:

* Invalid URLs
* Unsupported URLs
* Failed media extraction
* Download errors
* FFmpeg processing failures
* Network failures
* Rate limiting
* Missing dependencies
* Server-side errors

A failed conversion should never leave the interface stuck in an indefinite loading state.

---

# Responsible Use

SonicFlow is intended for media that users are authorized to download, transform or remix.

Users are responsible for respecting:

* Copyright
* Platform terms
* Creator rights
* Applicable laws
* Licensing restrictions

---

# Known Limitations

Media platforms can change their delivery systems and access requirements.

Because SonicFlow relies on external media extraction and processing tools, availability may depend on:

* Platform changes
* Network conditions
* yt-dlp compatibility
* Server resources
* Rate limiting
* FFmpeg availability

---

# Roadmap

```text
[x] YouTube URL processing
[x] MP3 extraction
[x] MP4 processing
[x] Original audio
[x] 8D audio
[x] 16D audio
[x] Animated interface
[x] Promotional reel

[ ] Download progress visualization
[ ] Audio waveform preview
[ ] More spatial presets
[ ] Custom spatial intensity
[ ] Batch processing
[ ] Playlist support
[ ] Audio preview
[ ] Persistent conversion history
[ ] Advanced audio controls
```

---

# Future Spatial Presets

Possible future processing modes:

```text
Original
8D
16D
32D
Bass Boost
Cinema
Wide Stereo
Ambient
Lo-Fi
Headphone Mode
```

The goal is to make SonicFlow evolve from a converter into a broader **personal audio transformation tool**.

---

# Security

Production deployments should consider:

* URL validation
* Request rate limiting
* Temporary-file cleanup
* File-size limits
* Input sanitization
* CORS configuration
* Process isolation
* Automatic expiration of generated files

Media-processing services should never trust arbitrary user input directly.

---

# Development Workflow

```text
Design
  ↓
Build
  ↓
Animate
  ↓
Test
  ↓
Process
  ↓
Deploy
  ↓
Monitor
```

Git workflow:

```bash
git checkout main-2
git add .
git commit -m "Improve SonicFlow experience"
git push origin main-2
```

---

# Screenshots

Add project screenshots here:

```text
assets/
├── screenshot-home.png
├── screenshot-processing.png
├── screenshot-audio-modes.png
└── screenshot-download.png
```

Example:

<div align="center">

<img src="./assets/screenshot-home.png" width="850"/>

<br/><br/>

<img src="./assets/screenshot-processing.png" width="850"/>

</div>

---

# Links

<div align="center">

### SonicFlow

**Live Demo**

https://sonicflow-sc0u.onrender.com

**GitHub**

https://github.com/TheHUNTER2714/SonicFlow

**Promotional Reel**

https://ireel.today/v/b6d86cd724

</div>

---

# Project Information

| Category            | Details                       |
| ------------------- | ----------------------------- |
| Project             | SonicFlow                     |
| Type                | Media Transformation Platform |
| Frontend            | HTML / CSS / JavaScript       |
| Backend             | Node.js / Express             |
| Media Extraction    | yt-dlp                        |
| Media Processing    | FFmpeg                        |
| Audio Modes         | Original / 8D / 16D           |
| Frontend Deployment | Netlify                       |
| Backend Deployment  | Render                        |
| Status              | Active Development            |

---

# Author

<div align="center">

### Ayush Agnihotri

Computer Science & Engineering

Building projects around:

```text
Web Development
AI
Audio Experiences
Automation
Creative Interfaces
```

[GitHub](https://github.com/TheHUNTER2714)

</div>

---

# License

This project is intended for educational and experimental purposes.

Review the applicable licenses and platform terms before deploying or distributing a production version.

---

<div align="center">

## SonicFlow

### `Don't just download the sound. Experience it.`

<br/>

```text
8D  →  16D  →  Spatial Audio  →  SonicFlow
```

<br/>

<img src="./assets/sonicflow-hero.svg" width="650"/>

</div>
