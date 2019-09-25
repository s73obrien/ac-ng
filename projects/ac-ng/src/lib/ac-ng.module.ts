import { NgModule, ModuleWithProviders } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AcNgJavascriptApiInterceptor } from './ac-ng-javascript-api.interceptor';
import { ApiModule } from '../api/api.module';

@NgModule({
  //imports: [ApiModule],
  exports: [ApiModule]
})
export class AcNgModule {
  public static forRoot(): ModuleWithProviders {
    return {
      ngModule: AcNgModule,
      providers: [
        // ApiModule,
        { provide: HTTP_INTERCEPTORS, useClass: AcNgJavascriptApiInterceptor, multi: true }
      ]
    };
  }
}
