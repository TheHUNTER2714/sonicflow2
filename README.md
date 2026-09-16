# SonicFlow

<div align="center">

<img src="./assets/sonicflow-hero.svg" alt="SonicFlow Animated Hero" width="100%"/>

<br/>

### Transform. Spatialize. Download.

**SonicFlow** is a modern audio/video conversion platform designed to transform YouTube media into downloadable audio and video while applying immersive spatial audio effects such as **8D and 16D sound**.

<br/>

[Live Demo](https://sonicflow2.onrender.com) · [GitHub Repository](https://github.com/TheHUNTER2714/SonicFlow)

</div>

---

## About SonicFlow

SonicFlow combines a modern web interface with a media-processing backend to provide a streamlined workflow for converting online video into audio or video formats.

The platform focuses on three things:

* Fast media conversion
* Immersive spatial audio processing
* A clean, modern user experience

Instead of treating conversion as a simple download operation, SonicFlow adds an audio-processing layer where users can generate spatialized versions of their audio.

### Supported output concepts

| Mode           | Description                                             |
| -------------- | ------------------------------------------------------- |
| MP4            | Download the source video                               |
| MP3            | Extract audio from the source                           |
| 8D Audio       | Apply rotating/panning spatial movement                 |
| 16D Audio      | Apply a stronger spatial movement effect                |
| Original Audio | Preserve the extracted audio without spatial processing |

---

# Experience

SonicFlow is designed around a simple workflow:

```text
YouTube URL
     │
     ▼
Media Extraction
     │
     ▼
Audio / Video Processing
     │
     ├───────────────┐
     ▼               ▼
Original Audio    Spatial Audio
                     │
              ┌──────┴──────┐
              ▼             ▼
             8D            16D
              │             │
              └──────┬──────┘
                     ▼
                 FFmpeg
                     │
                     ▼
                  Download
```

---

# Core Features

### Media Conversion

Convert supported YouTube media into:

* MP3
* MP4
* Extracted audio
* Processed spatial audio

### 8D Audio

Creates a moving stereo experience by continuously changing the perceived position of the audio.

SonicFlow uses FFmpeg audio filtering to create the spatial movement effect.

Example processing concept:

```text
Audio
  ↓
Stereo Processing
  ↓
Periodic Panning
  ↓
8D Output
```

### 16D Audio

16D mode applies a more pronounced spatial movement effect than the 8D mode.

```text
Audio
  ↓
Stereo Processing
  ↓
Faster / Stronger Panning
  ↓
16D Output
```

### Multiple Output Formats

Users can choose between audio and video output depending on their requirements.

### Modern Interface

The interface is designed around:

* Dark visual language
* Glassmorphism
* Smooth transitions
* Animated elements
* Responsive layouts
* Audio-focused visual effects
* Clear conversion states

### Download Experience

The application separates the conversion process from the final download state so users can clearly understand:

```text
Input
  ↓
Processing
  ↓
Conversion
  ↓
Ready
  ↓
Download
```

---

# Animated Interface

The visual language of SonicFlow uses animation as part of the experience rather than as decoration.

The animated hero follows the same principle as the provided reference: individual elements have independent animation timing, including staggered appearance, movement, pulsing and wipe transitions.

### Animation system

```text
Hero
 ├── Ambient background
 ├── Audio rings
 ├── Waveform
 ├── Floating particles
 ├── SonicFlow logo
 ├── Main heading
 ├── Typing text
 └── CTA elements
```

### Animation effects

* Fade-in
* Slide-up
* Scale-in
* Pulse
* Floating particles
* Rotating audio rings
* Waveform movement
* Staggered cards
* Underline wipe
* Button hover transitions
* Processing-state transitions

The animation timing should remain subtle so the README feels polished rather than overloaded.

---

# Typography

The primary visual typeface is:

**Space Grotesk**

Recommended supporting fonts:

```text
Space Grotesk
Inter
system-ui
sans-serif
```

The typography uses a clean hierarchy:

```text
SonicFlow
    ↓
Main headline
    ↓
Supporting description
    ↓
Feature labels
    ↓
Technical information
```

---

# Technology Stack

## Frontend

* HTML
* CSS
* JavaScript
* Responsive UI
* Modern animation techniques

## Backend

* Node.js
* Express.js
* REST API
* FFmpeg
* yt-dlp

## Media Processing

* FFmpeg
* yt-dlp
* M4A / audio streams
* MP3 encoding
* MP4 processing
* Stereo spatial processing

## Runtime

* Node.js
* Deno runtime support for media tooling

## Deployment

* Render

---

# Architecture

```text
                         ┌─────────────────────┐
                         │       Browser       │
                         │                     │
                         │   SonicFlow UI      │
                         └──────────┬──────────┘
                                    │
                                    │ HTTP
                                    ▼
                         ┌─────────────────────┐
                         │    Express API      │
                         │                     │
                         │ Request Handling    │
                         │ Validation          │
                         │ Download Control    │
                         └──────────┬──────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  │                                   │
                  ▼                                   ▼
          ┌───────────────┐                  ┌────────────────┐
          │    yt-dlp     │                  │     FFmpeg     │
          │               │                  │                │
          │ Media         │                  │ Audio          │
          │ Extraction    │                  │ Conversion     │
          └───────┬───────┘                  │ Spatial FX     │
                  │                          └───────┬────────┘
                  └────────────────┬─────────────────┘
                                   ▼
                         ┌─────────────────────┐
                         │   Generated Media   │
                         │                     │
                         │ MP3 / MP4 / 8D/16D │
                         └─────────────────────┘
```

---

# Processing Pipeline

## Step 1 — URL Input

The user provides a supported YouTube URL.

```text
https://youtube.com/watch?v=...
```

## Step 2 — Media Extraction

SonicFlow uses `yt-dlp` to obtain the required media stream.

```text
YouTube
   ↓
yt-dlp
   ↓
Audio / Video Stream
```

## Step 3 — Audio Extraction

When audio output is requested, the audio stream is extracted and prepared for processing.

```text
Video / Audio Stream
        ↓
Audio Extraction
        ↓
M4A / PCM / Intermediate Audio
```

## Step 4 — Spatial Processing

For 8D or 16D output, SonicFlow sends the audio through FFmpeg filters.

Conceptually:

```text
Original Audio
      ↓
Stereo Signal
      ↓
Dynamic Panning
      ↓
Spatial Movement
      ↓
Processed Audio
```

## Step 5 — Encoding

The processed audio can then be encoded into the requested output format.

```text
Processed Audio
      ↓
FFmpeg
      ↓
MP3
```

## Step 6 — Download

The final media file is returned to the client.

---

# FFmpeg Spatial Audio

SonicFlow's spatial audio effects are generated through FFmpeg processing.

### 8D

The 8D processing uses periodic panning:

```text
apulsator=mode=sine:hz=0.16:amount=0.95
```

### 16D

The 16D mode uses a faster and stronger movement:

```text
apulsator=mode=sine:hz=0.32:amount=0.98
```

These parameters control the periodic modulation used to create the perceived movement of the stereo signal.

---

# Project Structure

A typical SonicFlow structure is organized around the frontend, server and media-processing components:

```text
SonicFlow/
│
├── assets/
│   ├── sonicflow-hero.svg
│   └── ...
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── server.js
├── package.json
├── package-lock.json
├── README.md
├── .gitignore
└── ...
```

---

# API

The backend exposes endpoints for controlling the conversion workflow.

### Health Check

```http
GET /
```

Used to verify that the server is running.

### Audio Resolution

```http
POST /resolve-audio
```

Used to resolve and prepare the requested audio source.

### Honeypot-style or message endpoints

If additional experimental endpoints are present in a particular deployment, they should be documented separately rather than mixed with the core media API.

---

# Running Locally

## Requirements

Install the following before running SonicFlow:

* Node.js
* FFmpeg
* yt-dlp
* Git

Verify Node.js:

```bash
node --version
```

Verify npm:

```bash
npm --version
```

Verify FFmpeg:

```bash
ffmpeg -version
```

Verify yt-dlp:

```bash
yt-dlp --version
```

---

## Clone the Repository

```bash
git clone https://github.com/TheHUNTER2714/SonicFlow.git
```

Move into the project:

```bash
cd SonicFlow
```

Install dependencies:

```bash
npm install
```

---

## Start the Server

```bash
node server.js
```

For development, if the project is configured with a development script:

```bash
npm run dev
```

The application will normally be available at:

```text
http://localhost:10000
```

or the port specified by the environment configuration.

---

# Environment Configuration

For deployment, configure the required environment variables through the hosting platform rather than committing secrets to GitHub.

Example:

```env
PORT=10000
NODE_ENV=production
```

If additional API keys or provider configuration is introduced later, keep them in environment variables.

Never commit:

```text
.env
cookies.txt
API keys
private credentials
authentication tokens
```

---

# Deployment

SonicFlow can be deployed on a Node-compatible hosting platform such as Render.

### Render configuration

Typical configuration:

```text
Runtime: Node
Build Command: npm install
Start Command: node server.js
```

The application should listen on the platform-provided port:

```javascript
const PORT = process.env.PORT || 10000;
```

This allows the same application to run locally and in production.

---

# Production Considerations

Media extraction services can encounter restrictions imposed by upstream platforms.

Possible issues include:

* HTTP 429 responses
* Bot verification
* Temporary throttling
* Extraction failures
* Changes to YouTube delivery systems
* Unsupported media formats
* Missing external binaries

These are external-service limitations and should not be treated as frontend failures.

The application should surface a clear error instead of silently presenting unrelated fallback media as if it came from the requested URL.

---

# Error Handling

SonicFlow should distinguish between:

```text
Invalid URL
      ↓
Extraction Failure
      ↓
Processing Failure
      ↓
Encoding Failure
      ↓
Download Failure
```

Recommended user-facing states:

```text
Checking URL...
Fetching media...
Extracting audio...
Applying spatial effect...
Encoding output...
Preparing download...
Complete
```

For errors:

```text
Something went wrong while processing this media.
Please verify the URL and try again.
```

Technical details should remain available in server logs for debugging.

---

# Performance

SonicFlow is designed to avoid unnecessary processing.

The intended flow is:

```text
Request
  ↓
Validate
  ↓
Extract once
  ↓
Cache intermediate audio where useful
  ↓
Apply requested effect
  ↓
Encode
  ↓
Return result
```

Avoiding duplicate extraction requests is particularly important because repeated requests to an upstream media service can increase latency and trigger rate limiting.

---

# UX States

The interface should visually communicate every major state.

### Idle

```text
Paste your YouTube URL
```

### Loading

```text
Fetching media...
```

### Processing

```text
Creating spatial audio...
```

### Success

```text
Your file is ready
```

### Error

```text
Unable to process this URL
```

Transitions between these states should use short fade and slide animations rather than abrupt UI replacement.

---

# Design System

### Visual direction

```text
Dark
Minimal
Spatial
Audio-focused
Futuristic
Premium
```

### Components

* Glass cards
* Rounded controls
* Gradient backgrounds
* Audio waveform
* Circular sound rings
* Floating particles
* Animated buttons
* Progress indicators
* Conversion cards
* Download panel

### Motion

Motion should communicate:

* State
* Progress
* Hierarchy
* Interaction
* Completion

rather than simply making every component move continuously.

---

# Responsive Design

SonicFlow should work across:

```text
Desktop
Laptop
Tablet
Mobile
```

The layout should adapt by:

* Stacking conversion controls
* Scaling the hero animation
* Reducing decorative effects on smaller screens
* Keeping download actions prominent
* Maintaining readable typography

---

# Accessibility

The interface should maintain accessibility alongside visual effects.

Recommended practices:

* Semantic HTML
* Keyboard-accessible controls
* Visible focus states
* Descriptive button labels
* Alt text for decorative/content images
* Sufficient text contrast
* Reduced-motion support

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

# Responsible Use

SonicFlow should be used only with media that the user has permission or legal rights to download and process.

Users are responsible for complying with:

* Copyright law
* Platform terms
* Licensing restrictions
* Content-owner permissions
* Applicable local regulations

SonicFlow does not grant ownership or redistribution rights to downloaded media.

---

# Known Limitations

The application depends on external media extraction infrastructure, which means availability can change independently of SonicFlow.

Potential limitations include:

* YouTube extraction restrictions
* Rate limiting
* Bot detection
* Changes to YouTube formats
* Large-file processing time
* Server memory constraints
* FFmpeg processing cost
* Hosting platform timeout limits

---

# Roadmap

## Completed / Current

* [x] YouTube URL input
* [x] Audio extraction workflow
* [x] MP3 output
* [x] MP4 workflow
* [x] 8D audio processing
* [x] 16D audio processing
* [x] FFmpeg integration
* [x] Node.js backend
* [x] Responsive interface
* [x] Modern animated UI

## Planned

* [ ] Improved extraction reliability
* [ ] Better processing queue
* [ ] Progress percentage
* [ ] Download history
* [ ] More spatial presets
* [ ] Custom spatial intensity
* [ ] Audio preview
* [ ] Waveform visualization
* [ ] Batch processing
* [ ] Improved caching
* [ ] Better error reporting
* [ ] Automatic cleanup of temporary files
* [ ] More output formats

---

# Future Spatial Presets

Possible future presets:

```text
Original
8D
16D
Wide Stereo
Deep Space
Orbit
Surround
Custom
```

A future custom mode could expose controls such as:

```text
Movement Speed
Spatial Intensity
Stereo Width
Depth
Loop Duration
```

---

# Security Considerations

SonicFlow processes externally supplied URLs, so input validation is important.

The backend should:

* Validate URLs
* Restrict supported domains where appropriate
* Sanitize filenames
* Avoid shell-command injection
* Use safe process spawning
* Restrict temporary-file locations
* Delete temporary media after processing
* Apply request limits
* Avoid exposing server filesystem paths

Never directly concatenate user input into shell commands.

---

# Development Workflow

```text
Feature
  ↓
Local Development
  ↓
Testing
  ↓
Git Commit
  ↓
Git Push
  ↓
Deployment
  ↓
Production Testing
```

Recommended Git workflow:

```bash
git status

git add .

git commit -m "feat: improve audio processing"

git push origin main
```

---

# Contributing

Contributions are welcome.

### 1. Fork the repository

```bash
git clone https://github.com/TheHUNTER2714/SonicFlow.git
```

### 2. Create a branch

```bash
git checkout -b feature/improved-audio-processing
```

### 3. Make your changes

Keep changes focused and documented.

### 4. Commit

```bash
git add .
git commit -m "feat: improve audio processing"
```

### 5. Push

```bash
git push origin feature/improved-audio-processing
```

### 6. Open a Pull Request

Explain:

* What changed
* Why it changed
* How it was tested
* Any known limitations

---

# Screenshots

Add project screenshots here as the interface evolves.

Recommended screenshots:

```text
docs/
├── hero.png
├── converter.png
├── processing.png
├── download.png
└── mobile.png
```

Example:

```md
![SonicFlow Interface](./docs/converter.png)
```

---

# Demo

<div align="center">

### SonicFlow

Transform media into a new listening experience.

[Open SonicFlow](https://sonicflow2.onrender.com)

</div>

---

# Project Information

| Property         | Details                             |
| ---------------- | ----------------------------------- |
| Project          | SonicFlow                           |
| Category         | Media Conversion / Audio Processing |
| Backend          | Node.js + Express                   |
| Media Extraction | yt-dlp                              |
| Processing       | FFmpeg                              |
| Audio Effects    | 8D / 16D                            |
| Deployment       | Render                              |
| Repository       | TheHUNTER2714/SonicFlow             |

---

# Author

<div align="center">

### Ayush Agnihotri

Computer Science & Engineering Student
Full-Stack Developer · AI/ML Enthusiast · Builder

<br/>

[GitHub](https://github.com/TheHUNTER2714)

</div>

---

# License

Add the project's intended license here before publishing the repository.

For example:

```text
MIT License
```

Do not claim a license unless the repository actually contains that license.

---

<div align="center">

### SonicFlow

**Make sound move.**

Built with Node.js, FFmpeg, yt-dlp and a focus on immersive audio experiences.

<br/>

`Transform` · `Spatialize` · `Download`

</div>
