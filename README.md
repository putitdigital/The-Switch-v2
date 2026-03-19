# BANNER AUTOMATION APP

Angular 13, Express, MySQL


Configure api/{{versionnumber}}/config.json to setup up your local MySQL database connection settings.

This is a "Banner Builder" application. Its main purpose is to allow users to automatically generate many different versions (variations) of digital ad banners from a single set of templates and assets.

Here's a typical user journey:

An administrator sets up Clients, Projects, and banner Templates. A template defines the layout and which parts of the banner (like text or images) are replaceable.
A user navigates to the main dashboard.
They select a client, a project, and a template.
They choose the banner sizes they want to create.
For each banner size, they upload assets (e.g., different headlines, call-to-action texts, and images).
The application then takes all these assets and generates every possible combination, creating a large number of banner variations.
Finally, the user can export all these variations, which are conveniently packaged into a single zip file for download. The banners can be exported as static images (JPG), animated GIFs, or fully interactive HTML5 ads.