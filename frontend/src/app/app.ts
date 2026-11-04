/**
 * Root Application Component that bootstraps the dashboard view.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from '../app/components/dashboard/dashboard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DashboardComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  title = 'Brightline HR Dashboard';
}