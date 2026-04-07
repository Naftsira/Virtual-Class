# Lectra - Virtual Class Platform

## Overview

Lectra is a virtual classroom platform designed to enable seamless,
accessible, and collaborative learning from anywhere. It combines
real-time communication, interactive tools, and AI-powered assistance to
enhance both teaching and learning experiences.

## Vision

"Think, Draw, Learn."

Lectra aims to remove barriers of distance and time, empowering
individuals to take full ownership of their learning process.

## Problem Statement

Traditional learning environments are constrained by: - Physical
location - Limited interaction - Inefficient communication tools

Lectra addresses these issues by providing a fully digital, interactive
classroom environment.

## Core Features

### 1. Real-Time Communication

-   Live Chat (WebSocket-based)
-   Group Voice Calls (WebRTC with SFU)

### 2. Interactive Learning Tools

-   Virtual Whiteboard for real-time drawing and explanations
-   Collaborative discussion environment

### 3. Assignment System

-   Lecturer-created assignments
-   Student submissions and tracking

### 4. AI Integration (Experimental)

-   AI-generated subject summaries
-   Real-time discussion assistance during sessions

## Architecture

### Frontend

-   Handles UI, whiteboard rendering, and real-time interaction

### Backend

-   Laravel (API & business logic)
-   Express.js (real-time services)

### Databases

-   PostgreSQL (structured data)
-   MongoDB Atlas (real-time & flexible data)

### Communication Layer

-   WebSocket (chat)
-   WebRTC (voice)

## Infrastructure

### Hosting

-   Vercel (Frontend deployment)
-   AWS Free Tier (planned, subject to availability)
-   VPS required for persistent WebSocket connections

### AI Stack

-   Ollama (local model runtime)
-   Qwen 3.5 4B (LLM)
-   Cloudflare Tunnel (secure exposure)

## Scalability

-   Designed with cross-platform expansion in mind
-   Future support for mobile applications

## Design Preview (Planned)

-   Lecturer Dashboard (class tracking, attendance)
-   Student Dashboard
-   Whiteboard Interface
-   Voice Rooms
-   Chat System
-   AI Assistant Panel

## Limitations

-   Some features are experimental
-   Infrastructure constraints (no dedicated VPS yet)

## Future Improvements

-   Stable AI deployment on cloud
-   Improved voice infrastructure
-   Mobile application release
-   Enhanced collaboration tools

## Author

Theo Jesen Naftali Sirait\
Informatics Engineering

Email: theo.sirait28@gmail.com\
Website: https://naftalists.space

