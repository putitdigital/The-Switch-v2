import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { DatePipe, Location } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { DialogConfirmComponent, DialogRestoreComponent } from '@app/components';
import { Account, BannerSize, BannerType, Client, Template } from '@app/core/models';
import { AccountService, AlertService, BannerService, BannerSizeService, BannerTypeService, ClientService, ComponentService, ContainerService, TemplateService } from '@app/core/services';
import * as introJs from 'intro.js';
import { Observable, Subject } from 'rxjs';
import { first, map, startWith, takeUntil } from 'rxjs/operators';
import * as XLSX from 'xlsx';

@Component({
	templateUrl: './list.page.html',
	styleUrls: ['./list.page.scss'],
	providers: [
		DatePipe
	]
})
export class TemplatesListPage implements OnInit, OnDestroy {

	// will use the _destroy$ observable to control
	// fetching items from an observable
	private _destroy$ = new Subject<boolean>();

	public primaryData!: any[];
	public sortedData!: any[];

	public myaccount!: Account;

	//user onboarding
	private introJS = introJs();

	// MatPaginator Inputs
	public length!: number;
	public pageSize = 20;
	public currentPage = 0;
	public pageSizeOptions: number[] = [5, 10, 20, 40, 100];

	private allData!: any[];//Model[];

	// MatPaginator Output
	public pageEvent!: PageEvent;

	// autocomplete
	chipCtrl = new FormControl();
	visible = true;
	selectable = true;
	removable = true;
	addOnBlur = true;
	readonly separatorKeysCodes: number[] = [ENTER, COMMA];
	@ViewChild('chipInput') chipInput!: ElementRef;

	//  select filter data
	public clientFilterValue: any;
	public templateFilterValue: any;
	public bannersizeFilterValue: any;
	public bannertypeFilterValue: any;
	public statusFilterValue: any;

	public filterDataClients: Client[] = [];
	public filterDataTemplates: Template[] = [];
	public filterDataBannerSizes: BannerSize[] = [];
	public filterDataBannerTypes: BannerType[] = [];

	// autocomplete filter
	public filteredNames!: Observable<any[] | undefined>;
	public activeNameFilters: any[] = [];
	public masterReference_names: any[] = [];

	constructor(
		private alertService: AlertService,
		private dialog: MatDialog,
		private location: Location,
		private templateService: TemplateService,
		private containerService: ContainerService,
		private bannerService: BannerService,
		private componentService: ComponentService,
		private accountService: AccountService,
		private clientService: ClientService,
		private bannerTypeService: BannerTypeService,
		private bannerSizeService: BannerSizeService,
		private datePipe: DatePipe
	) {
		this.clientFilterValue = new FormControl('');
		this.templateFilterValue = new FormControl('');
		this.bannersizeFilterValue = new FormControl('');
		this.bannertypeFilterValue = new FormControl('');
		this.statusFilterValue = new FormControl('');

		this.accountService.account
			.pipe(takeUntil(this._destroy$))
			.subscribe((x: any) => this.myaccount = x);

		this.templateService.template
			.pipe(takeUntil(this._destroy$))
			.subscribe(
				(templates: Template[]) => {
					////console.log('collection subscription:', templates);

					this.allData = Array.isArray(templates) ? templates : [];
					////console.log("allData : ",this.allData);

					if (Array.isArray(templates)) {
						this.initialise(this.allData);

						this.initialiseTextFilters();
					}
				}
			);
		this.templateService.getAll()
			.pipe(takeUntil(this._destroy$))
			.subscribe(
				(templates: Template[]) => {
					////console.log('templates', templates);
					this.filterDataTemplates = templates;
				}
			);
		this.bannerTypeService.getAll()
			.pipe(takeUntil(this._destroy$))
			.subscribe(
				(bannertypes: BannerType[]) => {
					////console.log('bannertypes', bannertypes);
					this.filterDataBannerTypes = bannertypes;
				}
			);

		this.bannerSizeService.getAll()
			.pipe(takeUntil(this._destroy$))
			.subscribe(
				(bannersizes: BannerSize[]) => {
					////console.log('bannersizes', bannersizes);
					this.filterDataBannerSizes = bannersizes;
				}
			);

		this.clientService.getAll()
			.pipe(takeUntil(this._destroy$))
			.subscribe(
				(clients: Client[]) => {
					////console.log('Clients', clients);
					this.filterDataClients = clients;
				}
			);

		this.onboarding();
	}

	ngOnInit() {
		this.templateService.getAll()
			.pipe(first())
			.pipe(takeUntil(this._destroy$))
			.subscribe();
	}

	ngOnDestroy(): void {
		//console.warn('Templates List ngOnDestroy');
		this._destroy$.next(false);
		this._destroy$.complete();
	}

	// filters
	private initialiseTextFilters() {

		this.masterReference_names = this.allData.map((jk: any) => {
			return {
				'id': jk.id,
				'name': jk.name
			}
		});
		//this.masterReference_locations = _.uniq(this.masterReference_locations, y => y.location);

		this.filteredNames = this.chipCtrl.valueChanges.pipe(
			startWith(null),
			map((so: any | null) => {
				console.warn('this.filteredNames:', so);

				if (Number(so)) {
					return;
				}

				return so ? this.myTextFilter('name', so) : this.masterReference_names.slice()
			}));

	}
	private myTextFilter(type: string, name: string) {
		//console.warn(email);
		switch (type) {
			case 'name':
				return this.masterReference_names.filter(so => so.name.toLowerCase().indexOf(name.toLowerCase()) === 0);
			default:
				return [];
		}
	}

	public selectedTextFilter(event: MatAutocompleteSelectedEvent, type: string): void {

		this.removeSelectedFiltered(type);

		//this.filterAlphabet = 'all';

		switch (type) {
			case 'name':
				this.sortedData = [this.allData.find(x => x.id === event.option.value)];
				this.length = this.sortedData.length;
				this.activeNameFilters = this.sortedData;
				break;
			default:
				break;
		}

	}

	public removeSelectedFiltered(type: string): void {

		switch (type) {
			case 'name':
				this.activeNameFilters.pop();
				break;
			default:
				break;
		}

		this.sortedData = this.primaryData.slice();
		this.length = this.sortedData.length;
		this.iterator();
	}

	public onFilterChange(filter: string): void {

		let newdata: any;

		// use form patch value
		// show meta data table when editing
		//this.clientFilterValue.value = '';
		//this.templateFilterValue.value = '';
		///this.bannersizeFilterValue.value = '';
		//this.bannertypeFilterValue.value = '';

		//console.warn('onFilterChange:', filter, this.clientFilterValue.value, this.templateFilterValue.value, this.bannersizeFilterValue.value, this.bannertypeFilterValue.value, this.statusFilterValue.value);

		newdata = this.allData;

		if (this.clientFilterValue.value && this.clientFilterValue.value !== undefined) {
			newdata = newdata.filter((x: any) => {
				if (x.clientId === this.clientFilterValue.value) {
					//console.log(x.clientId === this.clientFilterValue.value)
				}
				return x.clientId === this.clientFilterValue.value
			});
		}

		if (this.templateFilterValue.value && this.templateFilterValue.value !== undefined) {
			newdata = newdata.filter((x: any) => {
				return x.container.banner.templateId === this.templateFilterValue.value
			});
		}

		if (this.bannertypeFilterValue.value && this.bannertypeFilterValue.value !== undefined) {
			newdata = newdata.filter((x: any) => {
				return x.bannertypeId === this.bannertypeFilterValue.value
			});
		}

		if (this.bannersizeFilterValue.value && this.bannersizeFilterValue.value !== undefined) {
			newdata = newdata.filter((x: any) => {
				return x.bannersizeId === this.bannersizeFilterValue.value
			});
		}

		if (this.statusFilterValue.value && this.statusFilterValue.value !== undefined) {
			newdata = newdata.filter((x: any) => {
				return x.status === this.statusFilterValue.value
			});
		}

		this.initialise(newdata);

	}


	private initialise(templates: Template[]): void {
		////console.log("initialise :");
		this.primaryData = templates;
		////console.log("sortedData 4 b 4 :",this.sortedData);
		this.sortedData = this.primaryData.slice();
		////console.log("sortedData 4 af :",this.sortedData);

		this.length = this.sortedData.length;

		this.iterator();

	}

	public toggleStatus(event: any, id: string): void {

		/**/
		this.updateStatus(id, {
			status: event.checked
		});
		/**/
	}

	private updateStatus(id: string, params: any): void {
		this.templateService.updateStatus(id, params)
			.pipe(first())
			.subscribe({
				next: () => {
					this.alertService.success('Record Status changed successfully', { keepAfterRouteChange: true });
					//this.router.navigate(['../../'], { relativeTo: this.route });
				},
				error: error => {
					this.alertService.error(error);
					//this.loading = false;
				}
			});
	}

	public deleteModel(id: string): void {
		const model = this.primaryData.find((x) => x.id === id);
		model.isDeleting = true;

		const confirmDialog = this.dialog.open(DialogConfirmComponent, {
			data: {
				title: 'Confirm Delete Action',
				message: 'Are you sure you want to delete: ' + model.name + '? This will also delete all associated banners and they\'re  respective components.'
			}
		});
		confirmDialog.afterClosed().subscribe(result => {
			if (result === true) {

				/**/
				this.templateService.delete(id)
					.pipe(first())
					.subscribe({
						next: () => {
							//this.primaryData = this.primaryData.filter(x => x.id !== id);
							this.primaryData.find((x) => {
								if (x.id === id) {
									x.deletedAt = new Date();
									x.status = false;
									////console.log('update model', this.primaryData);
									this.iterator();
								}
							});

							this.alertService.success(model.name + ' Deleted successfully.', { keepAfterRouteChange: true });

							model.isDeleting = false;
							/** WIP /
							const bannerDeletePromises = [];
							for (let index = 0; index < model.banners.length; index++) {
								const element =  model.banners[index];

								bannerDeletePromises.push(
									this.bannerService.delete(element.id)
								);

							}

							forkJoin(bannerDeletePromises)
								.pipe(last())
								.subscribe({
									next: ( bannersObj:any[] ) => {

										this.alertService.success(  model.name + ' Creatives successfully.', { keepAfterRouteChange: true });

										const containerDeletePromises = [];
										const componentsDeletePromises = [];

										for (let index = 0; index < model.banners.length; index++) {
											const banner =  model.banners[index];
											for (let index2 = 0; index2 < banner.containers.length; index2++) {
												const container =  banner.containers[index2];
												containerDeletePromises.push(
													this.containerService.delete(container.id)
												);

												// components
												for (let index3 = 0; index3 < container.components.length; index3++) {
													const component =  container.components[index3];
													componentsDeletePromises.push(
														this.componentService.delete(component.id)
													);
												}
											}
										}

										// delete components
										forkJoin(componentsDeletePromises)
											.pipe(last())
											.subscribe({
												next: ( containersObj:any[] ) => {

													this.alertService.success(  model.name + ' Components Deleted successfully.', { keepAfterRouteChange: true });
													model.isDeleting = false;
												},
												error: error => {
													this.alertService.error(error);
													model.isDeleting = false;
												}
											});

										// delete containers
										forkJoin(containerDeletePromises)
											.pipe(last())
											.subscribe({
												next: ( containersObj:any[] ) => {

													this.alertService.success(  model.name + ' Containers Deleted successfully.', { keepAfterRouteChange: true });
													model.isDeleting = false;
												},
												error: error => {
													this.alertService.error(error);
													model.isDeleting = false;
												}
											});


									},
									error: error => {
										this.alertService.error(error);
										model.isDeleting = false;
									}
								});
							/**/

						},
						error: (error: string) => {
							this.alertService.error(error);
							model.isDeleting = false;
						}
					});
				/**/
			} else {
				//console.info('Cancel Removing ID:', id);

				model.isDeleting = false;
			}
		});
	}

	public restoreModel(id: string): void {
		const model = this.primaryData.find((x) => x.id === id);
		model.isDeleting = true;

		const confirmDialog = this.dialog.open(DialogRestoreComponent, {
			data: {
				title: 'Confirm Restoration Action',
				message: 'Are you sure you want to restore this record: ' + model.name
			}
		});
		confirmDialog.afterClosed().subscribe(result => {
			if (result === true) {

				/**/
				this.templateService.restore(id)
					.pipe(first())
					.subscribe({
						next: () => {
							this.alertService.success(model.name + ' Restored successfully.', { keepAfterRouteChange: true });
							model.isDeleting = false;

							this.primaryData.find((x) => {
								if (x.id === id) {
									x.deletedAt = null;
									x.status = true;
									////console.log('update model', this.primaryData);
									this.iterator();
								}
							});

							/** WIP /
							const bannerRestorePromises = [];
							for (let index = 0; index < model.banners.length; index++) {
								const element =  model.banners[index];

								bannerRestorePromises.push(
									this.bannerService.restore(element.id)
								);

							}

							forkJoin(bannerRestorePromises)
								.pipe(last())
								.subscribe({
									next: ( bannersObj:any[] ) => {

										this.alertService.success(  model.name + ' Creatives Restored successfully.', { keepAfterRouteChange: true });

										const containerRestorePromises = [];
										const componentsRestorePromises = [];

										for (let index = 0; index < model.banners.length; index++) {
											const banner =  model.banners[index];
											for (let index2 = 0; index2 < banner.containers.length; index2++) {
												const container =  banner.containers[index2];
												containerRestorePromises.push(
													this.containerService.restore(container.id)
												);

												// components
												for (let index3 = 0; index3 < container.components.length; index3++) {
													const component =  container.components[index3];
													componentsRestorePromises.push(
														this.componentService.restore(component.id)
													);
												}
											}
										}

										// delete components
										forkJoin(componentsRestorePromises)
											.pipe(last())
											.subscribe({
												next: ( containersObj:any[] ) => {

													this.alertService.success(  model.name + ' Components Restored successfully.', { keepAfterRouteChange: true });
													model.isDeleting = false;
												},
												error: error => {
													this.alertService.error(error);
													model.isDeleting = false;
												}
											});

										// delete containers
										forkJoin(containerRestorePromises)
											.pipe(last())
											.subscribe({
												next: ( containersObj:any[] ) => {

													this.alertService.success(  model.name + ' Containers Restored successfully.', { keepAfterRouteChange: true });
													model.isDeleting = false;
												},
												error: error => {
													this.alertService.error(error);
													model.isDeleting = false;
												}
											});

									},
									error: error => {
										this.alertService.error(error);
										model.isDeleting = false;
									}
								});
							/**/
						},
						error: (error: string) => {
							this.alertService.error(error);
							model.isDeleting = false;
						}
					});
				/**/
			} else {
				//console.info('Cancel Restoring record ID:', id);

				model.isDeleting = false;
			}
		});
	}

	public back(): void {
		this.location.back();
	}

	private onboarding(): void {

		this.introJS.setOptions({
			showStepNumbers: true,
			showProgress: true,

			steps: [
				{
					title: 'Template Design',
					element: '#hint-action-btn-create',
					intro: "Click here to create a new template."
				},
				{
					element: '#hint-action-btn-export',
					intro: "Click here to download a spreadsheet with a list of templates."
				},
				{
					element: '#hint-action-btn-back',
					intro: "Click here to go back to previous page."
				},
				{
					element: '#toggle-status',
					intro: "Enable template status so it can be visible when you in dashboard creating templates or, disable so it can be invisble."
				},
				{
					element: '#edit-btn',
					intro: "Click here to edit template details."
				},
				{
					element: '#mng-creatives-btn',
					intro: "Click here to manage template design layouts."
				},
				{
					element: '#btn-audit',
					intro: "Click here to get template history."
				},
				{
					element: '#btn-delete',
					intro: "Click here to delete template."
				},
			],
			/**/
		});
	}

	public help(): void {

		//this.introJS.refresh();

		//this.introJS.addHints();

		//this.introJS.showHints();

		this.introJS.start();
	}

	public audit(id: number): void {

		const model = this.primaryData.find((x) => x.id === id);
		model.isVC = false;

		this.alertService.info('Version History still in WIP.', { keepAfterRouteChange: true });

	}

	public export(): void {

		const exportArray = this.primaryData.map((data, index) => {
			return {
				'ID': data.id,
				'Name': data.name,
				'Description': data.description,
				'Client': data.client.name,
				'Creative Type': data.bannertype.name,
				'Creatives': data.banners.length,
				'status': (data.status === true) ? 'Active' : 'Inactive',
				'created': this.datePipe.transform(data.created, 'yyyy-MM-dd HH:mm:ss'),
				'updated': this.datePipe.transform(data.updated, 'yyyy-MM-dd HH:mm:ss'),
				'deletedAt': this.datePipe.transform(data.deletedAt, 'yyyy-MM-dd HH:mm:ss')
			}

		});

		/* generate worksheet */
		const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportArray);

		/* generate workbook and add the worksheet */
		const wb: XLSX.WorkBook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

		/* save to file */
		XLSX.writeFile(wb, 'BAPP_Templates.xlsx');

	}

	// PAGINATION FUNCS
	public sortData(sort: Sort): void {

		const data = this.sortedData.slice();
		if (!sort.active || sort.direction === '') {
			this.sortedData = data;
			return;
		}

		this.sortedData = data.sort((a, b) => {
			const isAsc = sort.direction === 'asc';
			switch (sort.active) {
				case 'id': return this.compare(a.id, b.id, isAsc);
				case 'name': return this.compare(a.name, b.name, isAsc);
				case 'description': return this.compare(a.description, b.description, isAsc);
				case 'client': return this.compare(a.client.name, b.client.name, isAsc);
				case 'bannertype': return this.compare(a.bannertype.name, b.bannertype.name, isAsc);
				case 'banners': return this.compare(a.banners.length, b.banners.length, isAsc);
				case 'status': return this.compare(a.status, b.status, isAsc);
				case 'lastEditedBy': return this.compare(a.lastEditedBy, b.lastEditedBy, isAsc);
				case 'created': return this.compare(a.created, b.created, isAsc);
				case 'updated': return this.compare(a.updated, b.updated, isAsc);
				case 'deletedAt': return this.compare(a.deletedAt, b.deletedAt, isAsc);
				default: return 0;
			}
		});
	}

	private compare(a: number | string | boolean, b: number | string | boolean, isAsc: boolean): number {
		return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
	}

	public setPageSizeOptions(setPageSizeOptionsInput: string): void {
		if (setPageSizeOptionsInput) {
			this.pageSizeOptions = setPageSizeOptionsInput.split(',').map(str => +str);
		}
	}

	public handlePage(e: any): void {
		this.currentPage = e.pageIndex;
		this.pageSize = e.pageSize;
		this.iterator();
	}

	private iterator(): void {
		const end = (this.currentPage + 1) * this.pageSize;
		const start = this.currentPage * this.pageSize;
		const part = this.primaryData.slice(start, end);
		this.sortedData = part;
	}
}
