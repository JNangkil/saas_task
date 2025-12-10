import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Import services
import { AuthService } from '../core/services/auth.service';

@NgModule({
    declarations: [
        // Standalone components are not declared in NgModules
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
        // Standalone components are not exported from NgModules
    ]
})
export class AuthModule { }