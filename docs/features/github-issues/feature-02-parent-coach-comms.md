# Parent-Coach Communication Enhancement

## Overview
Refine and enhance the parent-coach communication mechanisms to improve engagement between coaches and parents, particularly for time-sensitive information like voice notes with positive/negative sentiment about a child's performance or wellbeing.

## Current State
- Ralph has implemented basic message-based parent-coach communication
- Coach initiates messages, parents receive them in their dashboard
- VoiceNote system exists but alerts/notifications for parents are not fully wired

## Purpose
Enable coaches to communicate effectively with parents about their child's progress, performance, and important updates. Ensure parents receive timely notifications about important updates (e.g., positive training sentiment, areas of concern) so they can support their child appropriately.

## Communication Strategy: Hybrid Approach
1. **Flows for Structured Communications**
   - Use existing flow system for organized, multi-step communications
   - Onboarding, announcements, structured feedback

2. **Notifications for Urgent Alerts**
   - Real-time notifications for time-sensitive information
   - Voice note sentiments (positive/negative training feedback)
   - Injury alerts, attendance issues
   - Quick action required from parents

## Key Features to Refine

### 1. Voice Note Alerts to Parents
- When a coach leaves a voice note about a child, trigger parent notification
- Include sentiment analysis results (positive, neutral, negative)
- Allow parent to view the voice note and any transcription
- Parent can acknowledge or respond to coach

### 2. Notification Channels
- In-app notifications (dashboard alerts)
- Email notifications (configurable by parent)
- Push notifications (future phase)

### 3. Parent Response Mechanism
- Parents can acknowledge receipt of coach messages
- Parents can initiate responses/questions
- Track read/unread status

### 4. Coach Dashboard
- View which parents have seen/acknowledged messages
- Track response rates
- Ability to send follow-up messages

### 5. Communication Preferences
- Parents can set notification preferences (email, app, frequency)
- Coaches can mark messages as "urgent" or "info only"
- Organization-level communication policies

## User Flows to Define
1. **Coach leaves positive voice note** → Parent notification → Parent views → Parent acknowledges
2. **Coach sends urgent message** → Immediate alert → Parent responds → Coach notified
3. **Parent initiates question** → Coach receives → Coach responds → Parent notified
4. **Bulk communication** → Multiple parents notified → Track engagement

## Technical Considerations
- Leverage existing flow system for structured comms
- Build lightweight notification system for real-time alerts
- Integration with VoiceNote system
- Email integration (SendGrid, Resend, or similar)
- Consider message history and threading

## Success Criteria
- Parents receive timely notifications about their child
- Coaches can easily communicate with parents
- High parent engagement rates (message read rates)
- Clear audit trail of all communications
- System is intuitive for both coaches and parents

## References
- Existing message system implemented by Ralph
- VoiceNote system: `docs/features/voice-notes.md`
- Flow system: `docs/architecture/flow-wizard-system.md`
