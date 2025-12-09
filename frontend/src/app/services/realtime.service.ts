import { Injectable } from '@angular/core';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { Subject } from 'rxjs';

declare global {
    interface Window {
        Pusher: any;
        Echo: any;
    }
}

@Injectable({
    providedIn: 'root'
})
export class RealtimeService {
    private echo: Echo<any> | null = null;
    private connectionStatus = new Subject<boolean>();

    // Configuration - In a real app, these should be in environment files
    private config = {
        broadcaster: 'reverb' as any,
        key: 'saas_task_key',
        wsHost: 'localhost',
        wsPort: 8080,
        wssPort: 8080,
        forceTLS: false,
        encrypted: false,
        enabledTransports: ['ws', 'wss'],
    };

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        // Avoid re-initialization
        if (this.echo) {
            return;
        }

        // Set Pusher on window object as required by laravel-echo for 'reverb'/'pusher' driver
        window.Pusher = Pusher;

        try {
            this.echo = new Echo({
                broadcaster: this.config.broadcaster,
                key: this.config.key,
                wsHost: this.config.wsHost,
                wsPort: this.config.wsPort,
                wssPort: this.config.wssPort,
                forceTLS: this.config.forceTLS,
                encrypted: this.config.encrypted,
                enabledTransports: this.config.enabledTransports,
                disableStats: true,
            });

            this.echo.connector.pusher.connection.bind('connected', () => {
                console.log('Realtime service connected');
                this.connectionStatus.next(true);
            });

            this.echo.connector.pusher.connection.bind('disconnected', () => {
                console.log('Realtime service disconnected');
                this.connectionStatus.next(false);
            });

            this.echo.connector.pusher.connection.bind('unavailable', () => {
                console.log('Realtime service unavailable');
                this.connectionStatus.next(false);
            });

        } catch (error) {
            console.error('Error initializing RealtimeService:', error);
        }
    }

    /**
     * Listen to a private channel
     */
    public listen(channelName: string, eventName: string, callback: (data: any) => void): void {
        if (!this.echo) {
            return;
        }

        // Handle channel type inferred from name, but usually 'board.{id}' is private
        // Laravel Echo usually assumes private for private() method.
        // If the channel name doesn't start with 'private-', Echo adds it if using private().

        // Using private channel by default for boards
        this.echo.private(channelName)
            .listen(eventName, (data: any) => {
                console.log(`Event received [${channelName}]: ${eventName}`, data);
                callback(data);
            });
    }

    /**
     * Listen to a presence channel
     */
    public join(channelName: string,
        hereCallback: (users: any[]) => void,
        joiningCallback: (user: any) => void,
        leavingCallback: (user: any) => void): void {
        if (!this.echo) {
            return;
        }

        this.echo.join(channelName)
            .here(hereCallback)
            .joining(joiningCallback)
            .leaving(leavingCallback)
            .error((error: any) => {
                console.error(`Error joining presence channel ${channelName}:`, error);
            });
    }

    /**
     * Leave a channel
     */
    public leave(channelName: string): void {
        if (this.echo) {
            this.echo.leave(channelName);
        }
    }

    public isConnected(): boolean {
        return this.echo?.connector?.pusher?.connection?.state === 'connected';
    }
}
