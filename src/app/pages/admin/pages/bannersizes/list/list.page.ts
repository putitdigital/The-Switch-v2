import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { DatePipe, Location } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { DialogConfirmComponent, DialogRestoreComponent } from '@app/components';
import { Account, BannerSize, BannerType, Client, ComponentModel, Template } from '@app/core/models';
import { AccountService, AlertService, BannerSizeService, BannerTypeService, ClientService, ComponentService, TemplateService } from '@app/core/services';
import * as introJs from 'intro.js';
import { Subject, Observable } from 'rxjs';
import { first, map, startWith, takeUntil } from 'rxjs/operators';
import * as XLSX from 'xlsx';

@Component({
	templateUrl: './list.page.html',
	styleUrls: ['./list.page.scss'],
	providers: [
		DatePipe
	]
})
export class BannerSizesListPage implements OnInit, OnDestroy {

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
	public pageSize = 10;
	public currentPage = 0;
	public pageSizeOptions: number[] = [5, 10, 40, 100];

	// MatPaginator Output
	public pageEvent!: PageEvent;

	private allData!: any[];//ComponentModel[];
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
		private bannerSizeService: BannerSizeService,
		private accountService: AccountService,
		private clientService: ClientService,
		private bannerTypeService: BannerTypeService,
		private templateService: TemplateService,
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

		this.bannerSizeService.bannerSize
			.pipe(takeUntil(this._destroy$))
			.subscribe(
				(bannersizes: BannerSize[]) => {
					////console.log('collection subscription:', bannersizes);

					if (!Array.isArray(bannersizes)) {
						return;
					}

					this.allData = bannersizes;
					this.initialise(bannersizes);
					this.initialiseTextFilters();
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
		this.bannerSizeService.getAll()
			.pipe(first())
			.pipe(takeUntil(this._destroy$))
			.subscribe();
	}

	ngOnDestroy(): void {
		//console.warn('Banner Size List ngOnDestroy');
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
				//console.warn('this.filteredNames:', so);

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

		////console.log('selectedTextFilter['+type+']:', this.sortedData);

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
				return x.container.banner.template.clientId === this.clientFilterValue.value
			});
		}

		if (this.templateFilterValue.value && this.templateFilterValue.value !== undefined) {
			newdata = newdata.filter((x: any) => {
				return x.container.banner.templateId === this.templateFilterValue.value
			});
		}

		if (this.bannertypeFilterValue.value && this.bannertypeFilterValue.value !== undefined) {
			newdata = newdata.filter((x: any) => {
				return x.container.banner.bannertypeId === this.bannertypeFilterValue.value
			});
		}

		if (this.bannersizeFilterValue.value && this.bannersizeFilterValue.value !== undefined) {
			newdata = newdata.filter((x: any) => {
				return x.container.banner.bannersizeId === this.bannersizeFilterValue.value
			});
		}

		if (this.statusFilterValue.value && this.statusFilterValue.value !== undefined) {
			newdata = newdata.filter((x: any) => {
				return x.status === this.statusFilterValue.value
			});
		}

		this.initialise(newdata);

		/** /
		switch (filter) {

			case 'client':

				if( this.clientFilterValue.value === undefined ) {
					this.initialise(this.allData);
				} else {

					newdata = this.allData.filter((x) => {
						return x.container.banner.template.clientId === this.clientFilterValue.value
					});

					this.initialise(newdata);
				}

				break;

			case 'template':

				if( this.templateFilterValue.value === undefined ) {
					this.initialise(this.allData);
				} else {

					newdata = this.allData.filter((x) => {
						return x.container.banner.templateId === this.templateFilterValue.value
					});

					this.initialise(newdata);
				}

				break;

			case 'bannertype':

				if( this.bannertypeFilterValue.value === undefined ) {
					this.initialise(this.allData);
				} else {

					newdata = this.allData.filter((x) => {
						return x.container.banner.bannertypeId === this.bannertypeFilterValue.value
					});

					this.initialise(newdata);
				}

				break;

			case 'bannersize':

				if( this.bannersizeFilterValue.value === undefined ) {
					this.initialise(this.allData);
				} else {

					newdata = this.allData.filter((x) => {
						return x.container.banner.bannersizeId === this.bannersizeFilterValue.value
					});

					this.initialise(newdata);
				}

				break;

			case 'status':

				newdata = this.allData.filter((x) => {
					return x.status === this.statusFilterValue.value
				});

				this.initialise(newdata);

				break;

			default:

				this.initialise(this.allData);

				break;
		}
		/**/

	}

	private initialise(bannersizes: BannerSize[]): void {

		this.primaryData = bannersizes;
		this.sortedData = this.primaryData.slice();

		this.length = this.sortedData.length;

		this.iterator();

	}

	public toggleStatus(event: any, id: string) {

		/**/
		this.updateStatus(id, {
			status: event.checked
		});
		/**/
	}

	private updateStatus(id: string, params: any) {
		this.bannerSizeService.updateStatus(id, params)
			.pipe(first())
			.subscribe({
				next: () => {
					this.alertService.success('Record Status changed successfully', { keepAfterRouteChange: true });

				},
				error: error => {
					this.alertService.error(error);
					//this.loading = false;
				}
			});
	}

	public deleteModel(id: string) {
		const model = this.primaryData.find((x) => x.id === id);
		model.isDeleting = true;

		const confirmDialog = this.dialog.open(DialogConfirmComponent, {
			data: {
				title: 'Confirm Delete Action',
				message: 'Are you sure you want to delete: ' + model.name
			}
		});
		confirmDialog.afterClosed().subscribe(result => {
			if (result === true) {

				/**/
				this.bannerSizeService.delete(id)
					.pipe(first())
					.subscribe({
						next: () => {
							this.alertService.success(model.name + ' Deleted successfully.', { keepAfterRouteChange: true });
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
				this.bannerSizeService.restore(id)
					.pipe(first())
					.subscribe({
						next: () => {
							this.alertService.success(model.name + ' Restored successfully.', { keepAfterRouteChange: true });
							model.isDeleting = false;
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
					title: 'Creative Sizes',
					element: '#hint-action-btn-create',
					intro: "Click here to create a new creative size."
				},
				{
					element: '#hint-action-btn-export',
					intro: "Click here to download a spreadsheet with a list of creative sizes.",
				},
				{
					element: '#toggle-status',
					intro: "Click here to enable a size so it is availabe for designing/ editing or, disable to make it invisble.",
				},
				{
					element: '#btn-edit',
					intro: "Click here to a edit creative size.",
				},
				{
					element: '#btn-audit',
					intro: "Click here to get creative size history.",
				},
				{
					element: '#btn-delete',
					intro: "Click here to delete a creative size.",
				}

			]
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
				'width': data.width,
				'height': data.height,
				'Creatives': data.banners.length,
				'Status': (data.status === true) ? 'Active' : 'Inactive',
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
		XLSX.writeFile(wb, 'BAPP_Available_Creative_Sizes.xlsx');

	}

	// PAGINATION FUNCS
	public sortData(sort: Sort) {

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
				case 'status': return this.compare(a.status, b.status, isAsc);
				case 'width': return this.compare(a.width, b.width, isAsc);
				case 'height': return this.compare(a.height, b.height, isAsc);
				case 'banners': return this.compare(a.banners.length, b.banners.length, isAsc);
				case 'lastEditedBy': return this.compare(a.lastEditedBy, b.lastEditedBy, isAsc);
				case 'created': return this.compare(a.created, b.created, isAsc);
				case 'updated': return this.compare(a.updated, b.updated, isAsc);
				case 'deletedAt': return this.compare(a.deletedAt, b.deletedAt, isAsc);
				default: return 0;
			}
		});
	}

	private compare(a: number | string | boolean, b: number | string | boolean, isAsc: boolean) {
		return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
	}

	public setPageSizeOptions(setPageSizeOptionsInput: string) {
		if (setPageSizeOptionsInput) {
			this.pageSizeOptions = setPageSizeOptionsInput.split(',').map(str => +str);
		}
	}

	public handlePage(e: any) {
		this.currentPage = e.pageIndex;
		this.pageSize = e.pageSize;
		this.iterator();
	}

	private iterator() {
		const end = (this.currentPage + 1) * this.pageSize;
		const start = this.currentPage * this.pageSize;
		const part = this.primaryData.slice(start, end);
		this.sortedData = part;
	}

}
