// Hide the intro video once it has finished playing, or when the user skips it.
const introVideo = document.getElementById('intro-video');
const introSkipButton = document.getElementById('intro-skip-button');

function hideIntroVideo() {
    if (introVideo) {
        introVideo.pause();
        introVideo.style.display = 'none';
    }
    if (introSkipButton) {
        introSkipButton.style.display = 'none';
    }
}

if (introVideo) {
    introVideo.addEventListener('ended', hideIntroVideo);
}

if (introSkipButton) {
    introSkipButton.addEventListener('click', hideIntroVideo);
}
