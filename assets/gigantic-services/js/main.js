gsap.registerPlugin(ScrollTrigger);

console.log("running latest main script - march 6th 2026");

let desktopBreakpoint = 992;

if (document.readyState === 'complete') {
    init(); // page is already fully loaded
} else {
    window.addEventListener('load', init); // wait for it
}

window.addEventListener('load', runPreloader, { once: true });

function runPreloader() {
    const preloader = document.querySelector('.preloader');
    if (!preloader) return;

    // Kill any competing tweens on this element first
    gsap.killTweensOf(preloader);

    gsap.set(preloader, { visibility: 'visible', opacity: 1 });

    gsap.to(preloader, {
        opacity: 0,
        duration: 0.5,
        delay: 0.5,
        ease: 'power2.out',
        onComplete: () => gsap.set(preloader, { visibility: 'hidden' })
    });
}

var circleElements, textElements, dotElements;

// Default Inits
document.addEventListener("DOMContentLoaded", function () {

    // LENIS --------------------------------
    // disable browser scroll restoration default
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    window.lenis = new Lenis();

    //     window.addEventListener('load', forceScrollToTop);
    // window.addEventListener('pageshow', forceScrollToTop);

    // force scroll to top
    function forceScrollToTop() {
        const shouldKeepLenisRunning = sessionStorage.getItem("pageLoadedBefore") !== null;

        if (shouldKeepLenisRunning) {
            window.lenis.start();
            document.body.classList.remove('overflow-hidden');
        }

        lenis.scrollTo(0, { immediate: true });

        if (window.ScrollTrigger) {
            ScrollTrigger.refresh();
        }
    }

    // force to top on page load
    forceScrollToTop();

    // synchronize lenis scrolling with scrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // add lenis's requestAnimationFrame (raf) method to GSAP's ticker
    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    // disable lag smoothing in GSAP to prevent any delay in scroll animations
    gsap.ticker.lagSmoothing(0);

    // force scroll to top on page load and refresh events
    window.addEventListener('load', forceScrollToTop);
    window.addEventListener('beforeunload', forceScrollToTop);
    window.addEventListener('pageshow', forceScrollToTop); // For back/forward navigation

    //---------------------------------------

    // OPTIMIZED CIRCLE ROTATION - explicit transform-origin at init
    gsap.set('.circle-section', {
        transformOrigin: 'center center',
        force3D: true, // Hardware acceleration
        backfaceVisibility: 'hidden' // Prevent flicker
    });

    // pre-calculate and cache elements for better performance
    circleElements = gsap.utils.toArray('.circle-list-el-content');
    textElements = gsap.utils.toArray('.slice-line-divider-id .text-weight-medium');
    dotElements = textElements.map(el => el.previousSibling);


    gsap.set([
        '.circle-section',
        '.circle-list-container',
        '.slice-line-divider',
        '.line_box_container'
    ], {
        force3D: true,
        backfaceVisibility: 'hidden'
    });


    // LOADING ANIMATION
    const loadScreenContainer = document.querySelector('.load_screen_container');
    const initBtn = document.querySelector('.init_button');

    // Check if first session loading
    if (sessionStorage.getItem("pageLoadedBefore") === null) {

        window.lenis.stop();
        ScrollTrigger.getAll().forEach(st => st.disable());
        document.body.classList.add('overflow-hidden');

        // Load/ Enter page screen
        if (initBtn) {
            initBtn.addEventListener('click', (e) => {
                // e.stopPropagation(); // this setting is preventing audio init in some iOS browsers
                sessionStorage.setItem("pageLoadedBefore", "true");

                // hide loading screen
                // reveal hero content
                gsap.timeline().to('.load_screen_container', {
                    height: 0,
                    duration: 1,
                    ease: 'power2.out',
                    onComplete: () => {
                        if (loadScreenContainer) {
                            loadScreenContainer.remove();
                        }

                        // init();

                        window.lenis.start();
                        ScrollTrigger.getAll().forEach(st => st.enable());
                        document.body.classList.remove('overflow-hidden');

                        //ScrollTrigger.refresh();
                    }
                })
                    // .from('.navbar_component', {
                    //     yPercent: -100,
                    //     duration: .5,
                    //     ease: 'power2.out'
                    // }, "-=.2")
                    // .from('h1, .hero_section p, .hero_section a', {
                    //     yPercent: 100,
                    //     opacity: 0,
                    //     duration: .8,
                    //     stagger: .25,
                    //     ease: 'power2.out'
                    // }, "<");

            });
        } else {
            // Loading for the first time outside of Homepage
            // re-enable Lenis
            window.lenis.start();
            document.body.classList.remove('overflow-hidden');
        }

    } else {
        // Not the first tab load - re-enable Lenis
        if (loadScreenContainer) {
            loadScreenContainer.remove();
        }
        window.lenis.start();
        document.body.classList.remove('overflow-hidden');
    }

});

function init() {

    // if (sessionStorage.getItem("pageLoadedBefore") === null) {
    //     console.log("First load - skipping init");
    //     return;
    // }

    if (window.innerWidth >= desktopBreakpoint && document.querySelector('.circle-section')) {

        console.log("Running desktop script");

        ScrollTrigger.refresh();
        setSliceLineWidth();

        const circle = document.querySelector('.circle-section');

        // hero title size reduction intoContact nav
        gsap.timeline({
            scrollTrigger: {
                trigger: '.hero_section',
                start: 'top top',
                end: 'bottom 55%',
                scrub: true,
            }
        }).to('.hero_title', {
            paddingTop: "0.5rem",
            fontSize: "3rem",
            top: '0'
        }).to('.hero_title_heading', {
            height: '1.5vw'
        }, "<");

        // hero circles rotation into 2nd section
        gsap.timeline({
            scrollTrigger: {
                trigger: '.hero_section',
                start: 'top top',
                end: 'bottom top',
                scrub: true,
            }
        }).to('.circle-section-container', {
            rotate: 0,
            ease: 'power2.out'
        });

        // circle intersection
        gsap.timeline({
            scrollTrigger: {
                trigger: '.intersection_triggger',
                start: 'top bottom',
                end: '+=300%',
                scrub: true,
                // pin: true,
            }
        }).to('.circle-section, .init-circle-section', {
            // delay: 1.2,
            width: '45vw',
            height: '45vw',
            top: '0vw',
            rotate: '45deg',
            duration: 2,
            ease: 'power2.out'
        })
            .fromTo('.text-zoom-in-first', {
                yPercent: 0,
                scale: .7
            }, {
                delay: .25,
                scale: 1.05,
                yPercent: -10,
                duration: .5,
            }, "<");


        if (window.innerWidth > 991) {
            // fix 'advantages' row blocks - only in desktop
            gsap.timeline({
                scrollTrigger: {
                    trigger: '.advantages_section',
                    start: 'top top',
                    end: '+=225%',
                    pin: true,
                    pinSpacing: false,
                    scrub: true,
                    immediateRender: false,
                    duration: 1,
                    // anticipatePin: true,
                }
            }).to('.init-circle-section .circle_orbit_element', {
                opacity: 0,
                duration: .1,
                ease: 'power2.out'
            });
        }


        //corner lines close in to form an X
        gsap.timeline({
            scrollTrigger: {
                trigger: '.unified_lines_trigger',
                start: 'top-=20% bottom',
                end: 'bottom bottom-=10%',
                scrub: true,
            }
        })
            .to('.advantages_section', {
                opacity: 0,
                duration: .25
            })
            .to('.slice-line-divider.main-2', {
                opacity: 0, duration: 0
            }, "<")
            .fromTo('.text-zoom-in-second', {
                yPercent: 0,
                scale: .5
            }, {
                scale: 1.05,
                yPercent: -10,
                duration: 1,
            }, "<")
            .from('.border_square', {
                opacity: 0,
                duration: .2
            }, "<")
            .from('.border_square.left', {
                delay: .2,
                xPercent: -100,
                duration: 1,
                ease: 'power2.out'
            }, "<")
            .from('.border_square.right', {
                xPercent: 100,
                duration: 1,
                ease: 'power2.out'
            }, "<")
            .to('.init_lines_container', {
                opacity: 0,
                duration: 0
            })
            .to('.init-circle-section', {
                opacity: 0,
                duration: .5
            }, "<")
            .to('.slice-line-divider.main', {
                css: {
                    display: 'flex'
                },
                duration: 0
            }, "<")
            .to('.init-circle-section', {
                css: {
                    display: 'none'
                },
                duration: 0
            }, "<")
            .fromTo('.center_circle', {
                opacity: 0,
            }, {
                opacity: 1,
                duration: 0,
                immediateRender: false
            }, "<");

        let classSwitched = false;
        let logoClassSwitched = false;
        gsap.fromTo('.circle_mask', {
            width: '0vw',
            height: '0vw',
        }, {
            scrollTrigger: {
                trigger: '.circle_mask_zoom_trigger',
                start: 'top-=30% bottom',
                end: '+=300%',
                scrub: true,
                onUpdate: (self) => {
                    if (self.progress > .4 && !classSwitched) {
                        classSwitched = true;

                        document.querySelector('body').classList.add('dark');
                        document.querySelector('body').classList.add('dark-nav');
                    } else if (self.progress <= .4 && classSwitched) {
                        classSwitched = false;

                        document.querySelector('body').classList.remove('dark');
                        document.querySelector('body').classList.remove('dark-nav');
                    }

                    if (self.progress > .18 && !logoClassSwitched) {
                        logoClassSwitched = true;
                        document.querySelector('body').classList.add('nav-logo-light');
                    } else if (self.progress <= .18 && logoClassSwitched) {
                        logoClassSwitched = false;
                        document.querySelector('body').classList.remove('nav-logo-light');
                    }
                },
            },
            width: '175vw',
            height: '175vw',
            duration: 1,
            immediateRender: false,
        });

        // note: zooms AND turns a bit
        gsap.timeline({
            scrollTrigger: {
                trigger: '.zoom-left-trigger',
                start: 'bottom bottom-=10%', // IF animation is skipping, revert back to 'bottom bottom'
                end: 'bottom 5%',
                scrub: true,
                // invalidateOnRefresh: true,
                // onEnterBack: () => {
                //     document.querySelector('body').classList.add('dark');
                //     // document.querySelector('.circle_mask').classList.add('hide');
                // },
                // onLeaveBack: () => {
                //     document.querySelector('body').classList.remove('dark');
                //     // document.querySelector('.circle_mask').classList.remove('hide');
                // }
            },
        })
            .to('.circle-section .circle_orbit_element', {
                opacity: 0,
                duration: .25,
                ease: 'power2.out'
            })
            .to('.circle-section',
                //     {
                //     left: '0vw',
                //     width: '45vw',
                //     height: '45vw',
                //     rotate: '45deg',
                //     ease: 'linear'
                // }, 
                {
                    left: '-80vw',
                    width: '100vw',
                    height: '100vw',
                    duration: 1,
                    // immediateRender: false
                }, "<")
            .to('.circle-section .slice-line-divider', {
                opacity: 1,
                duration: .5,
                ease: 'power2.out'
            }, "<")
            .to('.circle-section',
                // {
                //     rotate: "45deg",
                // },
                {
                    delay: .1,
                    rotate: "15deg",
                    immediateRender: false,
                    duration: 1,
                    ease: 'linear'
                }, "<");

        gsap.timeline({
            scrollTrigger: {
                trigger: '.circle_mask_light_zoom_trigger',
                start: 'top 55%',
                end: '+=150%',
                scrub: true,
                invalidateOnRefresh: true,
                onUpdate: self => {
                    const progress = self.progress;

                    // handle bg color
                    if (progress <= .55) {
                        document.querySelector('body').classList.add('dark');
                    } else {
                        document.querySelector('body').classList.remove('dark');
                    }

                    // handle nav buttons color
                    if (progress >= .1) {
                        document.querySelector('body').classList.remove('dark-nav');
                    } else {
                        document.querySelector('body').classList.add('dark-nav');
                    }

                    // handle nav logo color
                    if (progress >= .27) {
                        document.querySelector('body').classList.remove('nav-logo-light');
                    } else {
                        document.querySelector('body').classList.add('nav-logo-light');
                    }
                },
            },
        }).fromTo('.circle_mask_light', {
            width: '0vw',
            height: '0vw',
        }, {
            width: '350vw',
            height: '350vw',
            duration: 1,
            immediateRender: false
        })
            .fromTo('.circle-list-el-content, .slice-line-divider-id .text-weight-medium', {
                opacity: 0,
            }, {
                opacity: .2,
                duration: 0
            }, "<");


        // CIRCLE INNER SECTIONS ROTATION
        // fuller turn after initial small turn with zoom
        const circleElements = gsap.utils.toArray('.circle-list-el-content');
        const textElements = gsap.utils.toArray('.slice-line-divider-id .text-weight-medium');
        const rotationTl = gsap.timeline({
            scrollTrigger: {
                trigger: '.rotation_trigger',
                start: "top top",
                end: "+=650%",
                scrub: true,
                invalidateOnRefresh: true,
                anticipatePin: true,
                pin: true,
                onUpdate: self => {
                    // throttle updates to reduce calculation frequency
                    if (self.progress !== rotationTl.lastProgress) {
                        updateCircleElements(self.progress);
                        rotationTl.lastProgress = self.progress;
                    }
                    // const progress = self.progress;
                    // const totalElements = circleElements.length;

                    // circleElements.forEach((circle, index) => {
                    //     const correspondingText = textElements[index];
                    //     const correspondingDot = textElements[index].previousSibling;

                    //     const elementProgress = (progress * totalElements) - index;

                    //     let opacity;
                    //     let dotSize;
                    //     let dotLeft;
                    //     let dotBlur;

                    //     if (elementProgress <= 0) {
                    //         opacity = 0.2;
                    //         dotSize = 8;
                    //         dotLeft = 4;
                    //         dotBlur = 2;

                    //     } else if (elementProgress <= 0.3) {
                    //         opacity = 0.2 + ((elementProgress / 0.2) * 0.8); // Fade in from 0.2 to 1
                    //         dotSize = 8 + ((elementProgress / 8) * .8);
                    //         dotLeft = 4 + ((elementProgress / 4) * .8);
                    //         dotBlur = 2 + ((elementProgress / 2) * .8);

                    //     } else if (elementProgress <= 0.9) {
                    //         opacity = 1; // Hold at full opacity
                    //         dotSize = 20;
                    //         dotLeft = 10;
                    //         dotBlur = 4;
                    //     } else if (elementProgress <= 1) {
                    //         opacity = 1 - ((elementProgress - 0.9) / 0.1 * 0.8); // Fade out from 1 to 0.2
                    //         dotSize = 20 - ((elementProgress - 0.9) / 0.1 * 0.8);
                    //         dotLeft = 10 - ((elementProgress - 0.9) / 0.1 * 0.8);
                    //         dotBlur = 4 - ((elementProgress - 0.9) / 0.1 * 0.8);
                    //     } else {
                    //         opacity = 0.2;
                    //         dotSize = 8;
                    //         dotLeft = 4;
                    //         dotBlur = 2;
                    //     }

                    //     gsap.set([circle, correspondingText], { opacity });

                    //     gsap.set(correspondingDot, {
                    //         width: dotSize,
                    //         height: dotSize,
                    //         left: -dotLeft,
                    //         filter: `blur(${dotBlur}px)`,
                    //     });
                    // });
                }
            }
        })
            .to('.circle-section', {
                rotate: "-170deg",
                immediateRender: false,
                ease: 'linear',
                duration: 1
            });

        function updateCircleElements(progress) {
            const totalElements = circleElements.length;

            // Batch all calculations before DOM updates
            const updates = circleElements.map((_, index) => {
                const elementProgress = (progress * totalElements) - index;

                let opacity, dotSize, dotLeft, dotBlur;

                if (elementProgress <= 0) {
                    opacity = 0.2;
                    dotSize = 8;
                    dotLeft = 4;
                    dotBlur = 2;
                } else if (elementProgress <= 0.3) {
                    const factor = elementProgress / 0.3;
                    opacity = 0.2 + (factor * 0.8);
                    dotSize = 8 + (factor * 12);
                    dotLeft = 4 + (factor * 6);
                    dotBlur = 2 + (factor * 2);
                } else if (elementProgress <= 0.9) {
                    opacity = 1;
                    dotSize = 20;
                    dotLeft = 10;
                    dotBlur = 4;
                } else if (elementProgress <= 1) {
                    const factor = (elementProgress - 0.9) / 0.1;
                    opacity = 1 - (factor * 0.8);
                    dotSize = 20 - (factor * 12);
                    dotLeft = 10 - (factor * 6);
                    dotBlur = 4 - (factor * 2);
                } else {
                    opacity = 0.2;
                    dotSize = 8;
                    dotLeft = 4;
                    dotBlur = 2;
                }

                return { index, opacity, dotSize, dotLeft, dotBlur };
            });

            // apply all updates in a single batch
            gsap.set(circleElements, {
                opacity: i => updates[i].opacity
            });

            gsap.set(textElements, {
                opacity: i => updates[i].opacity
            });

            gsap.set(dotElements, {
                width: i => updates[i].dotSize,
                height: i => updates[i].dotSize,
                left: i => -updates[i].dotLeft,
                filter: i => `blur(${updates[i].dotBlur}px)`
            });
        }


        // BRAND CAROUSEL
        // move circle up
        setTimeout(() => {
            gsap.timeline({
                scrollTrigger: {
                    trigger: '.brand_carousel_trigger',
                    start: 'top bottom',
                    end: '+=100%',
                    scrub: true,
                    invalidateOnRefresh: true,
                    onUpdate: (self) => {
                        if (self.progress <= .5) {
                            document.querySelector('.rect_mask').style.opacity = 0;
                        }
                    }
                }
            })
                .to('.circle-section', {
                    top: '-65vw',
                    left: '-42vw',
                    rotate: "-170deg",
                    duration: 1,
                    ease: 'linear',
                    immediateRender: false
                });
            // .fromTo('.box_row_container', {
            //     // xPercent: -55,
            //     opacity: 0,
            // }, {
            //     // xPercent: -5,
            //     opacity: 1,
            //     duration: 1
            // });
        }, 200);


        // let boxLines = document.querySelectorAll('.circle-list-el-container.has-box');
        let boxes = document.querySelectorAll('.line_box_container');

        // let amountToRotate = 85;

        // old amount, on account of 6 boxes total
        const amountToRotate = 192;

        // NEW amount, on account of 6 boxes total (approximate value)
        // const amountToRotate = 275;


        // store last positions outside onUpdate
        let lastPositions = new Map();

        // rotate circle again - with brand boxes horizontal scroll over lines
        gsap.timeline({
            scrollTrigger: {
                trigger: '.brand_carousel_trigger',
                start: 'top top',
                end: '+=350%',
                scrub: true,
                pin: true,
                onEnter: () => {
                    gsap.set('.rect_mask', { opacity: 1, });

                    gsap.set('.circle-list-el-content, .slice-line-divider-id', { visibility: "hidden" });

                },
                onLeaveBack: () => {
                    gsap.set('.circle-list-el-content, .slice-line-divider-id', { visibility: "visible" });
                },
                onUpdate: (self) => {

                    let progress = self.progress;

                    // handle nav logo color and buttons
                    if (progress >= .65) {
                        document.querySelector('body').classList.add('nav-logo-light');
                        document.querySelector('body').classList.add('dark-nav');
                    } else {
                        document.querySelector('body').classList.remove('nav-logo-light');
                        document.querySelector('body').classList.remove('dark-nav');
                    }

                    boxes.forEach((box, index) => {
                        let line = document.querySelector(`[connect-box="${index}"]`);
                        if (!line) return;

                        // Your existing positioning calculation
                        let sectionRotation = gsap.getProperty('.circle-section', "rotation");
                        let containerRotation = gsap.getProperty('.circle-list-container', "rotation");
                        let lineRotation = gsap.getProperty(line, "rotation");

                        let totalRotation = sectionRotation + containerRotation + lineRotation;
                        let angleRad = totalRotation * (Math.PI / 180);

                        let circleRect = circle.getBoundingClientRect();
                        let originX = circleRect.left + circleRect.width / 2;
                        let originY = circleRect.top + circleRect.height / 2;

                        let boxRect = box.getBoundingClientRect();
                        let boxY = boxRect.top + boxRect.height / 2;
                        let deltaY = boxY - originY;

                        let intersectionX;
                        if (Math.abs(Math.cos(angleRad)) < 0.0001) {
                            intersectionX = originX;
                        } else {
                            intersectionX = originX + (deltaY * Math.cos(angleRad) / Math.sin(angleRad));
                        }

                        // round to nearest pixel
                        intersectionX = Math.round(intersectionX);
                        let newLeft = Math.round(intersectionX - (box.offsetWidth / 2));

                        // only update if position changed by more than [pixelTolerance] pixels (deadzone)
                        let pixelTolerance = 4;
                        let lastLeft = lastPositions.get(index);
                        if (lastLeft === undefined || Math.abs(newLeft - lastLeft) > pixelTolerance) {
                            // if (lastLeft === undefined) {
                            lastPositions.set(index, newLeft);

                            // Visibility based on scroll progress
                            let shouldShow = false;
                            if (index < 3) {
                                shouldShow = progress < 0.6;
                            } else {
                                shouldShow = progress >= 0.4;
                            }

                            gsap.set(box, {
                                left: newLeft,
                                opacity: shouldShow ? 1 : 0,
                                force3D: true // hardware acceleration
                            });
                        }
                    });
                }

            },
        }).to('.circle-list-el-container', {
            rotation: `-=${amountToRotate}`,
            immediateRender: false,
            ease: 'none',
        })
            .to('.rect_mask', {
                rotation: `-=${amountToRotate}`,
                immediateRender: false,
                ease: 'none',
                onStart: () => {
                    document.querySelector('body').classList.add('dark');
                },
                onReverseComplete: () => {
                    document.querySelector('body').classList.remove('dark');
                }
            }, "<")
            .fromTo('.box_row_container', {
                // xPercent: -55,
                opacity: 0,
            }, {
                // xPercent: -5,
                opacity: 1,
                duration: .05
            }, "<")
            .to('.mask_text_fade_in', {
                delay: .22,
                opacity: .8,
                duration: .25,
                ease: 'power2.out',
            }, "<")
            .to('.mask_text_fade_out', {
                opacity: 0,
                duration: .2,
                ease: 'power2.out',
            }, "<")
            .to('.circle_mask_light, .rect_mask', {
                opacity: 0,
                duration: 0,
                immediateRender: false
            });


        function setSliceLineWidth() {
            let lines = document.querySelectorAll('.slice-line-divider');

            // set line width to always be as wide as the viewport's diagonal*1.2 (largest possible visible line and a little more)
            lines.forEach((line) => {
                line.style.width = Math.sqrt(Math.pow(window.innerWidth, 2) + Math.pow(window.innerHeight, 2)) * 1.2 + "px";
            });
        }

        // window.addEventListener('resize', () => {
        //     setSliceLineWidth();
        // });

        // ScrollTrigger resize handler
        ScrollTrigger.addEventListener('refreshInit', setSliceLineWidth);


        const borderContainer = document.querySelector('.page_border_container');
        const contactSection = document.querySelector('.section_contact_form');

        // center circle element on scroll to Contact section
        gsap.timeline({
            scrollTrigger: {
                trigger: '.contact_section',
                start: 'top bottom',
                end: 'bottom bottom',
                scrub: true
            }
        })
            .fromTo('.circle_mask_red', {
                width: '0vw',
                height: '0vw',
            }, {
                width: '140vw',
                height: '140vw',
                duration: 1,
                immediateRender: false
            })
            .to('.box_row_container', {
                xPercent: 80,
                yPercent: 400,
                opacity: 0,
                duration: .5
            }, "<")
            .to('.slice-line-divider-inner', {
                backgroundColor: 'rgba(240, 231, 233, 0.16)',
            }, "<")
            .to('.circumference', {
                css: {
                    borderColor: 'rgba(240, 231, 233, 0.16)',
                }
            }, "<")
            .to('.navbar', {
                css: {
                    borderColor: 'rgba(240, 231, 233, 0.16)'
                }
            }, "<")
            .to('.circle-section', {
                left: 0,
                top: 'auto',
                width: '45vw',
                height: '45vw',
                immediateRender: false,
                duration: 1,
                onStart: () => {
                    borderContainer.classList.add('secondary');
                    contactSection.classList.add('active');
                },
                onReverseComplete: () => {
                    borderContainer.classList.remove('secondary');
                    contactSection.classList.remove('active');
                }
            }, "<")
            .to('.circle-list-container', {
                rotate: "-=" + (amountToRotate * .68),
                immediateRender: false,
                duration: 1,
                ease: 'power2.in',
            }, "<")
            .to('.circle-section .circle_orbit_element', {
                opacity: 1,
                duration: 1,
                ease: 'power2.in',
                immediateRender: false
            }, "<")
            .to('.slice-line-divider:not(.main)', {
                opacity: 0,
                duration: 1,
                immediateRender: false
            }, "<")
            .to(".circle_orbit_element, .center_circle", {
                css: {
                    backgroundColor: "#fff",
                },
                duration: 1,
            }, "<");

        ScrollTrigger.refresh();
    }

}