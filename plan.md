# Plan: School Management System Technical Document

## Goal
Create a comprehensive Markdown document covering all aspects of a School Management Application built with Node.js and React. The document will serve as a complete technical specification, architecture guide, and feature reference.

## Scope
All aspects of school management including:
- System Architecture & Tech Stack
- Student Management
- Teacher/Staff Management
- Academic Management (classes, subjects, curriculum, timetable)
- Attendance Management
- Examination & Grading System
- Fee & Finance Management
- Library Management
- Transport Management
- Hostel/Dormitory Management
- Communication & Notifications
- User Authentication & RBAC
- Reports & Analytics
- API Design (RESTful endpoints)
- Database Schema
- Frontend Architecture (React components, state management, routing)
- Deployment & DevOps
- Security Considerations

## Workflow

### Stage 1 — Outline Design
- Load report-writing skill (outline.md)
- Deploy sub-agents to design the chapter hierarchy
- Save outline to `/mnt/agents/output/sms.agent.outline.md`

### Stage 2 — Content Creation
- Load content.md skill file
- Deploy parallel writer sub-agents per chapter group
- Save chapters as `sms_sec{NN}.md`

### Stage 3 — Review & Assembly
- Merge all chapters
- Final validation
- Deliver `sms.agent.final.md`

## Skill Usage
- **report-writing**: Primary skill for outline, content creation, review, and assembly
