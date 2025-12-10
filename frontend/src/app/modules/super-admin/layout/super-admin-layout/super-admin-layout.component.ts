import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../../services/user.service';
import { UserProfile } from '../../../../models/user.model';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-super-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatListModule
  ],
  templateUrl: './super-admin-layout.html',
  styleUrl: './super-admin-layout.css',
})
export class SuperAdminLayoutComponent implements OnInit {
  currentUser: UserProfile | null = null;

  constructor(private userService: UserService) { }

  ngOnInit() {
    this.loadCurrentUser();
  }

  loadCurrentUser() {
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
      },
      error: (error) => {
        console.error('Failed to load current user:', error);
      }
    });
  }

  logout() {
    // Implement logout logic
    // This would typically call an auth service
  }
}
