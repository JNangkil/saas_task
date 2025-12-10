import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-landing-page',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './landing-page.component.html',
    styleUrls: ['./landing-page.component.css']
})
export class LandingPageComponent {
    features = [
        {
            icon: 'task_alt',
            title: 'Smart Task Management',
            description: 'Organize tasks with powerful boards, lists, and cards. Track progress with intuitive Kanban and calendar views.'
        },
        {
            icon: 'groups',
            title: 'Team Collaboration',
            description: 'Work together seamlessly with real-time updates, comments, and file sharing. Keep everyone on the same page.'
        },
        {
            icon: 'analytics',
            title: 'Powerful Analytics',
            description: 'Gain insights into team productivity with detailed reports, burndown charts, and custom dashboards.'
        },
        {
            icon: 'security',
            title: 'Enterprise Security',
            description: 'Bank-level encryption, SSO, MFA, and compliance certifications to keep your data safe.'
        },
        {
            icon: 'devices',
            title: 'Work Anywhere',
            description: 'Access your projects from any device with our responsive web app and mobile applications.'
        },
        {
            icon: 'integration_instructions',
            title: 'Powerful Integrations',
            description: 'Connect with Slack, GitHub, Jira, and 100+ other tools to streamline your workflow.'
        }
    ];

    testimonials = [
        {
            name: 'Sarah Johnson',
            role: 'CEO, TechStart',
            avatar: 'SJ',
            content: 'TaskFlow transformed how our team works. We shipped 40% faster after switching.',
            rating: 5
        },
        {
            name: 'Michael Chen',
            role: 'Product Manager, InnovateCo',
            avatar: 'MC',
            content: 'The best project management tool we\'ve ever used. Simple yet powerful.',
            rating: 5
        },
        {
            name: 'Emily Rodriguez',
            role: 'CTO, DesignHub',
            avatar: 'ER',
            content: 'Finally, a tool that scales with our growing team. Outstanding support too!',
            rating: 5
        }
    ];

    pricingHighlights = [
        { plan: 'Free', price: '$0', features: ['Up to 3 users', '2 workspaces', 'Basic features'] },
        { plan: 'Pro', price: '$12', features: ['Unlimited users', 'Unlimited workspaces', 'Advanced analytics'], popular: true },
        { plan: 'Enterprise', price: 'Custom', features: ['Custom integrations', 'SSO & SAML', 'Dedicated support'] }
    ];

    currentTestimonialIndex = 0;

    scrollToSection(sectionId: string): void {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    nextTestimonial(): void {
        this.currentTestimonialIndex = (this.currentTestimonialIndex + 1) % this.testimonials.length;
    }

    prevTestimonial(): void {
        this.currentTestimonialIndex = this.currentTestimonialIndex === 0
            ? this.testimonials.length - 1
            : this.currentTestimonialIndex - 1;
    }

    getStars(rating: number): number[] {
        return Array(rating).fill(0);
    }
}
