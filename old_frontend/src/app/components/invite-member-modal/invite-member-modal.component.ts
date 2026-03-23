import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { InvitationService } from '../../services/invitation.service';
import { ICreateInvitationRequest, IInvitation } from '../../interfaces/invitation.interface';
import { IWorkspaceMember } from '../../interfaces/workspace-member.interface';

@Component({
    selector: 'app-invite-member-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './invite-member-modal.component.html',
    styleUrls: ['./invite-member-modal.component.css']
})
export class InviteMemberModalComponent implements OnInit, OnDestroy {
    @Input() workspaceId: string | null = null;
    @Input() isVisible: boolean = false;
    @Input() existingMembers: IWorkspaceMember[] = [];
    @Input() pendingInvitations: IInvitation[] = [];

    @Output() close = new EventEmitter<void>();
    @Output() invitationSent = new EventEmitter<IInvitation[]>();
    @Output() error = new EventEmitter<string>();

    // Component state
    isLoading = false;
    errorMessage: string | null = null;
    successMessage: string | null = null;

    // Form
    inviteForm: FormGroup;

    // Role descriptions
    roleDescriptions = {
        admin: 'Can manage all workspace settings, members, and content',
        member: 'Can create and edit content, but cannot manage settings or members',
        viewer: 'Can only view content, cannot make any changes'
    };

    // Unsubscribe subject
    private destroy$ = new Subject<void>();

    constructor(
        private invitationService: InvitationService,
        private fb: FormBuilder
    ) {
        // Initialize form with custom email validator
        this.inviteForm = this.fb.group({
            emails: ['', [Validators.required, this.emailsValidator]],
            role: ['member', Validators.required],
            message: ['']
        });
    }

    ngOnInit(): void {
        // Reset form when modal becomes visible
        if (this.isVisible) {
            this.resetForm();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // Custom validator for comma-separated emails
    private emailsValidator(control: AbstractControl): ValidationErrors | null {
        if (!control.value) {
            return { required: true };
        }

        const emails = control.value.split(',').map((email: string) => email.trim());
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        for (const email of emails) {
            if (email && !emailRegex.test(email)) {
                return { invalidEmail: true, email: email };
            }
        }

        return null;
    }

    // Check if email is already a member
    private isExistingMember(email: string): boolean {
        return this.existingMembers.some(member =>
            member.email.toLowerCase() === email.toLowerCase()
        );
    }

    // Check if email already has a pending invitation
    private hasPendingInvitation(email: string): boolean {
        return this.pendingInvitations.some(invitation =>
            invitation.email.toLowerCase() === email.toLowerCase()
        );
    }

    // Get emails from form
    private getEmails(): string[] {
        const emailString = this.inviteForm.get('emails')?.value || '';
        return emailString.split(',').map((email: string) => email.trim()).filter((email: string) => email);
    }

    // Validate emails against existing members and pending invitations
    private validateEmails(): { valid: boolean; message: string } {
        const emails = this.getEmails();
        const invalidEmails: string[] = [];
        const existingMembers: string[] = [];
        const pendingInvitations: string[] = [];

        for (const email of emails) {
            if (this.isExistingMember(email)) {
                existingMembers.push(email);
            }
            if (this.hasPendingInvitation(email)) {
                pendingInvitations.push(email);
            }
        }

        if (existingMembers.length > 0) {
            return {
                valid: false,
                message: `The following users are already members: ${existingMembers.join(', ')}`
            };
        }

        if (pendingInvitations.length > 0) {
            return {
                valid: false,
                message: `The following users already have pending invitations: ${pendingInvitations.join(', ')}`
            };
        }

        return { valid: true, message: '' };
    }

    // Send invitations
    sendInvitations(): void {
        if (!this.workspaceId || this.inviteForm.invalid) {
            return;
        }

        // Validate emails against existing members and pending invitations
        const validation = this.validateEmails();
        if (!validation.valid) {
            this.errorMessage = validation.message;
            this.error.emit(validation.message);
            return;
        }

        const emails = this.getEmails();
        const role = this.inviteForm.get('role')?.value;
        const message = this.inviteForm.get('message')?.value || undefined;

        this.isLoading = true;
        this.errorMessage = null;
        this.successMessage = null;

        // Create invitation requests for each email
        const invitations: ICreateInvitationRequest[] = emails.map(email => ({
            email,
            role,
            message
        }));

        // Send all invitations
        const invitationPromises = invitations.map(invitation =>
            this.invitationService.createInvitation(+this.workspaceId!, invitation)
                .pipe(takeUntil(this.destroy$))
        );

        // Wait for all invitations to be sent
        let sentCount = 0;
        let failedEmails: string[] = [];
        const successfulInvitations: IInvitation[] = [];

        invitationPromises.forEach((promise, index) => {
            promise.subscribe({
                next: (invitation: IInvitation) => {
                    successfulInvitations.push(invitation);
                    sentCount++;

                    if (sentCount === emails.length) {
                        this.isLoading = false;

                        if (failedEmails.length === 0) {
                            this.successMessage = `Successfully sent ${emails.length} invitation(s)`;
                            this.invitationSent.emit(successfulInvitations);

                            // Close modal after a short delay
                            setTimeout(() => {
                                this.closeModal();
                            }, 1500);
                        } else {
                            this.errorMessage = `Failed to send invitations to: ${failedEmails.join(', ')}`;
                            this.error.emit(this.errorMessage);
                        }
                    }
                },
                error: (error) => {
                    failedEmails.push(emails[index]);
                    sentCount++;

                    if (sentCount === emails.length) {
                        this.isLoading = false;

                        if (successfulInvitations.length > 0) {
                            this.successMessage = `Successfully sent ${successfulInvitations.length} invitation(s)`;
                            this.invitationSent.emit(successfulInvitations);
                        }

                        if (failedEmails.length > 0) {
                            this.errorMessage = `Failed to send invitations to: ${failedEmails.join(', ')}`;
                            this.error.emit(this.errorMessage);
                        }

                        // Close modal if at least some invitations were sent
                        if (successfulInvitations.length > 0) {
                            setTimeout(() => {
                                this.closeModal();
                            }, 1500);
                        }
                    }
                }
            });
        });
    }

    // Close modal
    closeModal(): void {
        this.close.emit();
        this.resetForm();
    }

    // Reset form
    private resetForm(): void {
        this.inviteForm.reset({
            emails: '',
            role: 'member',
            message: ''
        });
        this.errorMessage = null;
        this.successMessage = null;
    }

    // Handle overlay click
    onOverlayClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.closeModal();
        }
    }

    // Get error message for emails field
    get emailsErrorMessage(): string {
        const emailsControl = this.inviteForm.get('emails');
        if (emailsControl?.errors?.['required']) {
            return 'Email address is required';
        }
        if (emailsControl?.errors?.['invalidEmail']) {
            return `Invalid email format: ${emailsControl.errors['email']}`;
        }
        return '';
    }

    // Get current role description
    get currentRoleDescription(): string {
        const role = this.inviteForm.get('role')?.value;
        return this.roleDescriptions[role as keyof typeof this.roleDescriptions] || '';
    }
}