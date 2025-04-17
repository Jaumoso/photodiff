# Photodiff

A very simple frontend to compare visual and EXIF data of 2 photos and spot differences.

## Usage options

- Grab and drop photos from your computer folders\*
- Copy paste photos from your computer folders\*
- Select photos via 'Select photos' button\*

\*_Only 2 files suported_

## Local deployment

It can be deployed via Docker or Docker Compose, but if a local development deployment is needed:

```
npm install -g live-server
live-server --port=8080 --no-browser
```

## Screenshots

#### Default Page

![Default Page](https://raw.githubusercontent.com/Jaumoso/photodiff/refs/heads/main/assets/examples/default.png)

#### Visual comparison slider

![Visual Slider](https://raw.githubusercontent.com/Jaumoso/photodiff/refs/heads/main/assets/examples/visual.png)

#### EXIF data comparison

![EXIF Data](https://raw.githubusercontent.com/Jaumoso/photodiff/refs/heads/main/assets/examples/exif.png)
