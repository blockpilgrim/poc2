import { Request, Response } from 'express';
import os from 'os';
import { config } from '../config';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
}

interface DetailedHealthStatus extends HealthStatus {
  system: {
    platform: string;
    release: string;
    totalMemory: string;
    freeMemory: string;
    cpuUsage: number;
  };
  services: {
    [key: string]: {
      status: 'healthy' | 'unhealthy' | 'degraded';
      message?: string;
    };
  };
}

class HealthController {
  /**
   * Basic health check
   */
  check(_req: Request, res: Response): void {
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      version: '1.0.0'
    };

    res.json(health);
  }

  /**
   * Detailed health check including system info and service status
   */
  async detailed(_req: Request, res: Response): Promise<void> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    const health: DetailedHealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      version: '1.0.0',
      system: {
        platform: os.platform(),
        release: os.release(),
        totalMemory: `${Math.round(totalMem / 1024 / 1024)} MB`,
        freeMemory: `${Math.round(freeMem / 1024 / 1024)} MB`,
        cpuUsage: Math.round((usedMem / totalMem) * 100)
      },
      services: {
        api: {
          status: 'healthy',
          message: 'API is running'
        },
        // Future service checks will go here
        database: {
          status: 'healthy',
          message: 'No database configured yet'
        },
        d365: {
          status: config.D365_URL ? 'healthy' : 'unhealthy',
          message: config.D365_URL ? 'D365 configured' : 'D365 not configured'
        },
        auth: {
          status: config.AZURE_CLIENT_ID ? 'healthy' : 'unhealthy',
          message: config.AZURE_CLIENT_ID ? 'Azure AD configured' : 'Azure AD not configured'
        }
      }
    };

    // Determine overall health
    const hasUnhealthyService = Object.values(health.services).some(
      service => service.status === 'unhealthy'
    );
    
    if (hasUnhealthyService) {
      health.status = 'unhealthy';
      res.status(503);
    }

    res.json(health);
  }
}

export const healthController = new HealthController();