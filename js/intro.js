// Hide the intro video once it has finished playing
        const introVideo = document.getElementById('intro-video');
        if (introVideo) {
            introVideo.addEventListener('ended', () => {
                introVideo.style.display = 'none';
            });
        }
