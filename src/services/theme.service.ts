
import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  darkMode = signal<boolean>(false);

  constructor() {
    // Load preference
    const saved = localStorage.getItem('darkMode');
    if (saved) {
      this.darkMode.set(JSON.parse(saved));
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.darkMode.set(true);
    }

    // Apply theme changes
    effect(() => {
      const isDark = this.darkMode();
      localStorage.setItem('darkMode', JSON.stringify(isDark));
      
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });
  }

  toggle() {
    this.darkMode.update(v => !v);
  }
}
