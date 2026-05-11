# Garden 🌿

Garden is a beautiful, distraction-free daily note-taking and journaling application built with React Native and Expo. Instead of just logging text, Garden turns your thoughts, moods, and reflections into a growing virtual garden.

## 📖 Use Case

In today's fast-paced world, maintaining a daily journaling habit can feel like a chore. Garden gamifies the experience of self-reflection. Every time you write an entry, you plant a "seed" that blossoms into a unique plant in your virtual garden. 

Whether you want to track your daily mood, jot down quick ideas, or write extensive daily reflections, Garden provides a peaceful environment to do so. Over time, your consistent habit visually manifests into a dense grid of plants, rewarding you for your dedication to logging your days.

## ✨ Key Features

- **Daily Journaling**: Write entries tied to specific dates in a clean, focused editor.
- **Mood Tracking**: Tag your daily entries with emojis and mood labels (e.g., Happy, Calm, Anxious, Sad) indicating how you felt.
- **The Garden View**: Every completed entry adds a new, uniquely generated plant to your "Garden". Watch your grid of plants grow as your writing habit consistency improves.
- **Typography & Customization**: Supports multiple elegant, distraction-free fonts to personalize your writing experience perfectly. 
- **History Tracking**: Easily look back at past entries using an intuitive calendar strip and a dedicated history view.
- **Local Storage**: Your personal entries remain completely private and are saved locally on your device via AsyncStorage.

## 🛠 Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Navigation**: Expo Router
- **Animations**: React Native Reanimated
- **Storage**: AsyncStorage (`@react-native-async-storage/async-storage`)
- **Fonts**: Expo Google Fonts (`crimson-pro`, `inter`, `lora`, `nunito`, `playfair-display`)

## 🚀 Getting Started

### Download the App (Android)

If you just want to install and try the app on your Android phone, you can download the `.apk` file directly from our **[GitHub Releases](../../releases)** page.

1. Download the latest `Garden.apk` file to your phone.
2. Tap the file to install it (you may need to allow "Install from unknown sources" in your Android settings).

### Development Setup

#### Prerequisites

Make sure you have Node.js installed, along with either the Expo Go app on your phone or an emulator/simulator setup on your machine.

#### Local Installation

1. Clone the repository and navigate to the project folder:
   ```bash
   cd Garden
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npm start
   ```

4. Press `i` to open in an iOS simulator, `a` for an Android emulator, or scan the QR code with the Expo Go app on your physical device.

## 🎨 Design & Aesthetics

The application features a sleek dark mode interface with subtle gradient reveals, carefully selected typography, and beautifully extracted PNG plants that blend perfectly into the serene environment of your virtual garden.

---
*Your garden is growing 🌱*
