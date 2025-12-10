import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Import components
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { LoginComponent } from './components/login/login.component';

// Import services
import { AuthService } from '../core/services/auth.service';

@NgModule({
    declarations: [
        ForgotPasswordComponent,
        ResetPasswordComponent,
        LoginComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule
    ],
    providers: [
        AuthService
    ],
    exports: [
        ForgotPasswordComponent,
        ResetPasswordComponent,
        LoginComponent
    ]
})
export class AuthModule { }