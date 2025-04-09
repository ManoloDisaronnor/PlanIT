import { Component, Renderer2, ElementRef, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-backgroundauth',
  imports: [RouterOutlet],
  templateUrl: './backgroundauth.component.html',
  styleUrls: ['./backgroundauth.component.css']
})
export class BackGroundAuthComponent {
  stars: any[] = [];
  connections: { element: HTMLElement, star1: number, star2: number }[] = [];
  private connectedPairs = new Set<string>();

  constructor(private renderer: Renderer2, private el: ElementRef) { }

  ngOnInit() {
    this.createConstellation();
  }

  private createConstellation() {
    const container = this.el.nativeElement.querySelector('.constellation-container');
    const starCount = 25;

    // Generar estrellas con posiciones más agrupadas
    for (let i = 0; i < starCount; i++) {
      const posX = 10 + Math.random() * 80;
      const posY = 10 + Math.random() * 80;

      this.createStar(container, posX, posY, i);
    }

    this.createSmartConnections();
  }

  private createStar(container: any, x: number, y: number, index: number) {
    const star = this.renderer.createElement('div');
    this.renderer.addClass(star, 'star');

    this.renderer.setStyle(star, 'left', `${x}%`);
    this.renderer.setStyle(star, 'top', `${y}%`);
    this.renderer.setStyle(star, 'opacity', '0');

    this.stars.push({
      element: star,
      x: x,
      y: y,
      group: null
    });

    this.renderer.listen(star, 'mouseenter', () => this.handleStarHover(star));
    this.renderer.listen(star, 'mouseleave', () => this.handleStarLeave(star));

    this.renderer.appendChild(container, star);

    setTimeout(() => {
      this.renderer.setStyle(star, 'opacity', '0.8');
    }, index * 50);
  }

  private createSmartConnections() {
    const container = this.el.nativeElement.querySelector('.constellation-container');
    const maxDistance = 30;
    const minConnections = 1;
    const maxConnections = 3;

    // Primera pasada: Conectar cada estrella con su vecino más cercano
    this.stars.forEach((star1, index) => {
      if (!this.hasConnections(index)) {
        const nearest: any = this.findNearestStar(index, maxDistance);
        if (nearest) {
          this.createConnection(star1, nearest.star, container);
        }
      }
    });

    // Segunda pasada: Crear conexiones adicionales
    this.stars.forEach((star1, index) => {
      const currentConnections = this.countConnections(index);
      if (currentConnections < maxConnections) {
        const availableStars = this.findConnectableStars(index, maxDistance, maxConnections - currentConnections);
        availableStars.forEach((star2: { star: any; index: number }) => {
          if (this.countConnections(index) < maxConnections &&
            this.countConnections(star2.index) < maxConnections) {
            this.createConnection(star1, star2.star, container);
          }
        });
      }
    });
  }

  private hasConnections(starIndex: number): boolean {
    return this.connections.some(conn =>
      conn.star1 === starIndex || conn.star2 === starIndex
    );
  }

  private countConnections(starIndex: number): number {
    return this.connections.filter(conn =>
      conn.star1 === starIndex || conn.star2 === starIndex
    ).length;
  }

  private findNearestStar(starIndex: number, maxDistance: number) {
    const star1 = this.stars[starIndex];
    let nearest = null;
    let minDist = Infinity;

    this.stars.forEach((star2, index) => {
      if (starIndex !== index) {
        const dist = this.calculateDistance(star1, star2);
        if (dist < minDist && dist <= maxDistance) {
          minDist = dist;
          nearest = { star: star2, index: index };
        }
      }
    });

    return nearest;
  }

  private findConnectableStars(starIndex: number, maxDistance: number, limit: number) {
    const star1 = this.stars[starIndex];
    const candidates: any = [];

    this.stars.forEach((star2, index) => {
      if (starIndex !== index &&
        this.calculateDistance(star1, star2) <= maxDistance &&
        !this.areConnected(starIndex, index)) {
        candidates.push({
          star: star2,
          index: index,
          distance: this.calculateDistance(star1, star2)
        });
      }
    });

    return candidates
      .sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance)
      .slice(0, limit);
  }

  private areConnected(star1Index: number, star2Index: number): boolean {
    const pair1 = `${star1Index}-${star2Index}`;
    const pair2 = `${star2Index}-${star1Index}`;
    return this.connectedPairs.has(pair1) || this.connectedPairs.has(pair2);
  }

  private calculateDistance(star1: any, star2: any): number {
    return Math.hypot(star2.x - star1.x, star2.y - star1.y);
  }

  private createConnection(star1: any, star2: any, container: any) {
    const pairKey = `${this.stars.indexOf(star1)}-${this.stars.indexOf(star2)}`;
    if (this.connectedPairs.has(pairKey)) return;

    const line = this.renderer.createElement('div');
    this.renderer.addClass(line, 'connection');

    const angle = Math.atan2(star2.y - star1.y, star2.x - star1.x);
    const length = this.calculateDistance(star1, star2);

    this.renderer.setStyle(line, 'width', `${length}%`);
    this.renderer.setStyle(line, 'left', `${star1.x}%`);
    this.renderer.setStyle(line, 'top', `${star1.y}%`);
    this.renderer.setStyle(line, 'transform', `rotate(${angle}rad)`);
    this.renderer.setStyle(line, 'opacity', '0.15');

    this.connections.push({ element: line, star1: this.stars.indexOf(star1), star2: this.stars.indexOf(star2) });
    this.connectedPairs.add(pairKey);
    this.renderer.appendChild(container, line);
  }

  private handleStarHover(star: HTMLElement) {
    this.renderer.addClass(star, 'active');
    this.connections.forEach(connection => {
      this.renderer.setStyle(connection.element, 'opacity', '0.3');
    });
  }

  private handleStarLeave(star: HTMLElement) {
    this.renderer.removeClass(star, 'active');
    this.connections.forEach(connection => {
      this.renderer.setStyle(connection.element, 'opacity', '0.15');
    });
  }
}