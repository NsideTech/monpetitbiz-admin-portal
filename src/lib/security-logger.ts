/**
 * Logger pour les événements de sécurité
 * En production, intégrer avec Datadog, Sentry, CloudWatch, etc.
 */

export type SecurityEventType =
  | 'login_failed'
  | 'login_success'
  | 'rate_limit_exceeded'
  | 'invalid_token'
  | 'unauthorized_access'
  | 'csrf_validation_failed';

export interface SecurityEvent {
  type: SecurityEventType;
  username?: string;
  userId?: string;
  ip: string;
  userAgent?: string;
  timestamp: string;
  details?: Record<string, any>;
}

/**
 * Logger les événements de sécurité
 * En production, envoyer vers un service externe (Datadog, Sentry, etc.)
 */
export function logSecurityEvent(event: SecurityEvent): void {
  const logEntry = {
    ...event,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  };

  // En développement, afficher dans la console
  if (process.env.NODE_ENV === 'development') {
    const emoji = getEventEmoji(event.type);
    console.log(`${emoji} Security Event [${event.type}]:`, {
      username: event.username,
      ip: event.ip,
      details: event.details,
    });
  }

  // En production, envoyer vers un service de monitoring
  // TODO: Intégrer avec Datadog, Sentry, CloudWatch, etc.
  if (process.env.NODE_ENV === 'production') {
    // Pour l'instant, écrire dans un fichier de log
    // (À remplacer par une vraie solution en production)
    writeToLogFile(logEntry);
  }
}

function getEventEmoji(type: SecurityEventType): string {
  const emojiMap: Record<SecurityEventType, string> = {
    login_failed: '🔴',
    login_success: '✅',
    rate_limit_exceeded: '⚠️',
    invalid_token: '🔒',
    unauthorized_access: '🚫',
    csrf_validation_failed: '⛔',
  };
  return emojiMap[type] || '🔒';
}

function writeToLogFile(logEntry: any): void {
  try {
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(process.cwd(), 'logs');

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `security-${date}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Failed to write security log:', error);
  }
}
