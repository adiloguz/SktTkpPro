
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { InventoryService } from './services/inventory.service';
import { ThemeService } from './services/theme.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.component.html'
})
export class AppComponent {
  inventoryService = inject(InventoryService);
  themeService = inject(ThemeService);
  private router = inject(Router);

  isMobileMenuOpen = signal(false);
  isNotificationPanelOpen = signal(false);
  
  // Calculate alert count for badge
  expiredCount = this.inventoryService.expiredProducts;
  warningCount = this.inventoryService.warningProducts;

  constructor() {
    // Automatically close mobile menu when navigating
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.isMobileMenuOpen.set(false);
      this.isNotificationPanelOpen.set(false);
    });
  }
  
  get alertCount(): number {
    return this.expiredCount().length + this.warningCount().length;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  toggleNotifications() {
    this.isNotificationPanelOpen.update(v => !v);
  }

  closeNotifications() {
    this.isNotificationPanelOpen.set(false);
  }

  toggleTheme() {
    this.themeService.toggle();
  }

  getDays(dateStr: string): number {
    return this.inventoryService.getDaysRemaining(dateStr);
  }
}
