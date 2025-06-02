import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-featurecommingsoon',
  imports: [],
  templateUrl: './featurecommingsoon.component.html',
  styleUrl: './featurecommingsoon.component.css'
})
export class FeaturecommingsoonComponent {
  @Input() futureFeatures: string[] = [];
}
