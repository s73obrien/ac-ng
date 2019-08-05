import { Component } from '@angular/core';
import { ProjectsService } from 'ng-ace';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'ng-ace-test';
  constructor(public projectsService: ProjectsService) {}
  projects = this.projectsService.getAllProjects().pipe(
    map(m => m.map(project => project.name))
  );
}
