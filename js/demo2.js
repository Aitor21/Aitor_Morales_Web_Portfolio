{
    class Revealer {
        constructor(el, options) {
            this.options = {
                angle: 0
            };
            Object.assign(this.options, options);

            this.DOM = {};
            this.DOM.el = el;
            this.DOM.inner = this.DOM.el.firstElementChild;

            this.DOM.inner.style.width = `calc(100vw * ${Math.abs(Math.cos(this.options.angle * Math.PI/180))} + 100vh * ${Math.abs(Math.sin(this.options.angle * Math.PI/180))})`;
            this.DOM.inner.style.height = `calc(100vw * ${Math.abs(Math.sin(this.options.angle * Math.PI/180))} + 100vh * ${Math.abs(Math.cos(this.options.angle * Math.PI/180))})`;
            this.DOM.el.style.transform = `rotate3d(0,0,1,${this.options.angle}deg)`;

            this.DOM.reverse = this.DOM.inner.querySelector('.content__reverse');
            if ( this.DOM.reverse ) {
                TweenMax.set(this.DOM.reverse, {rotation: -1*this.options.angle});
            }
          }
      }

    const content = {
        first: document.querySelector('.content--first'),
        second: document.querySelector('.content--second'),
        third: document.querySelector('.content--third'),
        fourth: document.querySelector('.content--fourth')
    };

    const firstPageContent = {
        title: content.first.querySelector('.intro__titlegame'),
        enter: content.first.querySelector('.intro__enter'),
        entertwo: content.first.querySelector('.intro__entertwo'),
        enterthree: content.first.querySelector('.intro__enterthree')
    };

    charming(firstPageContent.title);
    firstPageContent.titleLetters = [...firstPageContent.title.querySelectorAll('span')];
    firstPageContent.titleLetters.sort(() => Math.round(Math.random())-0.5);

    let letters = firstPageContent.titleLetters.filter(_ => Math.random() < .5);

    let otherletters = firstPageContent.titleLetters.filter(el => letters.indexOf(el) < 0);


    const secondPageContent = {
        reel: content.second.querySelector('.reel'),
        backCtrl: content.second.querySelector('.content__back')
    };

    const thirdPageContent = {
        reel: content.third.querySelector('.reel'),
        backCtrl: content.third.querySelector('.content__back')
    };

    const fourthPageContent = {
        reel: content.fourth.querySelector('.reel'),
        backCtrl: content.fourth.querySelector('.content__back')
    };


    const revealer = new Revealer(content.first, {angle: 35});


    const showNextPage = () => {
        content.first.classList.add('content--hidden');

        const ease = Expo.easeInOut;
        const duration = 1.2;
        this.pageToggleTimeline = new TimelineMax()

        .staggerTo(otherletters, duration*0.8, {
            ease: ease,
            y: '-100%',
            scaleX: 0.8,
            scaleY: 1.5,
            opacity: 0
        }, 0.04, 0)
        .to(firstPageContent.enter, duration*0.5, {
            ease: ease,
            opacity: 0
        }, 0)
        .to(content.third, duration*0, {
            ease: ease,
            opacity: 0
        }, 0)
        .to(content.fourth, duration*0, {
            ease: ease,
            opacity: 0
        }, 0)

        .to(revealer.DOM.inner, duration, {
            ease: ease,
            y: '-100%'
        }, 0)

        .to(revealer.DOM.reverse, duration, {
            ease: ease,
            y: '100%'
        }, 0)

        .to(secondPageContent.reel, duration, {
            ease: ease,
            startAt: {y: 100},
            y: 0
        }, 0);
    };
    firstPageContent.enter.addEventListener('click', showNextPage);

    const showNextPagetwo = () => {

        content.first.classList.add('content--hidden');

        const ease = Expo.easeInOut;
        const duration = 1.2;
        this.pageToggleTimeline = new TimelineMax()

        .staggerTo(otherletters, duration*0.8, {
            ease: ease,
            y: '-100%',
            scaleX: 0.8,
            scaleY: 1.5,
            opacity: 0
        }, 0.04, 0)
        .to(firstPageContent.enter, duration*0.5, {
            ease: ease,
            opacity: 0
        }, 0)
        .to(content.second, duration*0, {
            ease: ease,
            opacity: 0
        }, 0)
        .to(content.fourth, duration*0, {
            ease: ease,
            opacity: 0
        }, 0)

        .to(revealer.DOM.inner, duration, {
            ease: ease,
            y: '-100%'
        }, 0)

        .to(revealer.DOM.reverse, duration, {
            ease: ease,
            y: '100%'
        }, 0)

        .to(thirdPageContent.reel, duration, {
            ease: ease,
            startAt: {y: 100},
            y: 0
        }, 0);
    };
    firstPageContent.entertwo.addEventListener('click', showNextPagetwo);

    const showNextPagethree = () => {

        content.first.classList.add('content--hidden');

        const ease = Expo.easeInOut;
        const duration = 1.2;
        this.pageToggleTimeline = new TimelineMax()

        .staggerTo(otherletters, duration*0.8, {
            ease: ease,
            y: '-100%',
            scaleX: 0.8,
            scaleY: 1.5,
            opacity: 0
        }, 0.04, 0)
        .to(firstPageContent.enter, duration*0.5, {
            ease: ease,
            opacity: 0
        }, 0)
        .to(content.second, duration*0, {
            ease: ease,
            opacity: 0
        }, 0)
        .to(content.third, duration*0, {
            ease: ease,
            opacity: 0
        }, 0)

        .to(revealer.DOM.inner, duration, {
            ease: ease,
            y: '-100%'
        }, 0)

        .to(revealer.DOM.reverse, duration, {
            ease: ease,
            y: '100%'
        }, 0)

        .to(fourthPageContent.reel, duration, {
            ease: ease,
            startAt: {y: 100},
            y: 0
        }, 0);
    };
    firstPageContent.enterthree.addEventListener('click', showNextPagethree);

    const showIntro = () => {

        content.first.classList.remove('content--hidden');
        this.pageToggleTimeline.reverse();
    };
    secondPageContent.backCtrl.addEventListener('click', showIntro);
    thirdPageContent.backCtrl.addEventListener('click', showIntro);
    fourthPageContent.backCtrl.addEventListener('click', showIntro);

    let enterHoverAnimationRunning = false;
    const onEnterHoverFn = () => {
        if ( enterHoverAnimationRunning ) {
            return false;
        }
        enterHoverAnimationRunning = true;

        letters = firstPageContent.titleLetters.filter(_ => Math.random() < .5);
        otherletters = firstPageContent.titleLetters.filter(el => letters.indexOf(el) < 0);

        new TimelineMax({onComplete: () => enterHoverAnimationRunning = false})
        .staggerTo(letters, 0.2, {
            ease: Quad.easeIn,
            y: '-100%',
            opacity: 0
        }, 0.04, 0)
        .staggerTo(letters, 0.6, {
            ease: Quint.easeOut,
            startAt: {y: '35%'},
            y: '0%',
            opacity: 1
        }, 0.04, 0.2);
    };
    firstPageContent.enter.addEventListener('mouseenter', onEnterHoverFn);
    firstPageContent.entertwo.addEventListener('mouseenter', onEnterHoverFn);
    firstPageContent.enterthree.addEventListener('mouseenter', onEnterHoverFn);
}
