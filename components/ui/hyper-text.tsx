"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, MotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

const DEFAULT_CHARACTER_SET = Object.freeze(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
) as readonly string[];

const getRandomInt = (max: number): number => Math.floor(Math.random() * max);

interface HyperTextProps extends MotionProps {
    /** Array of text to cycle through */
    texts: string[];
    className?: string;
    duration?: number;
    delay?: number;
    interval?: number; // How long each text stays before changing
    as?: React.ElementType;
    startOnView?: boolean;
    animateOnHover?: boolean;
    characterSet?: readonly string[];
}

export function HyperText({
    texts,
    className,
    duration = 1100,
    delay = 0,
    interval = 2000,
    as: Component = "div",
    startOnView = false,
    animateOnHover = true,
    characterSet = DEFAULT_CHARACTER_SET,
    ...props
}: HyperTextProps) {
    const MotionComponent = motion.create(Component, {
        forwardMotionProps: true,
    });

    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const [displayText, setDisplayText] = useState<string[]>(() =>
        texts[0].split("")
    );
    const [isAnimating, setIsAnimating] = useState(false);
    const iterationCount = useRef(0);
    const elementRef = useRef<HTMLElement>(null);

    // Cycle through texts
    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentTextIndex((prev) => (prev + 1) % texts.length);
            setIsAnimating(true);
        }, interval);

        return () => clearInterval(intervalId);
    }, [texts.length, interval]);

    // Scramble animation effect
    useEffect(() => {
        if (!isAnimating) return;

        const text = texts[currentTextIndex];
        const maxIterations = text.length;
        const startTime = performance.now();
        let animationFrameId: number;

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            iterationCount.current = progress * maxIterations;

            setDisplayText((currentText) =>
                currentText.map((letter, index) =>
                    letter === " "
                        ? letter
                        : index <= iterationCount.current
                            ? text[index]
                            : characterSet[getRandomInt(characterSet.length)]
                )
            );

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                setIsAnimating(false);
            }
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId);
    }, [currentTextIndex, texts, duration, characterSet, isAnimating]);

    return (
        <MotionComponent
            ref={elementRef}
            className={cn("overflow-hidden py-2 text-2xl font-Raleway", className)}
            onMouseEnter={() => animateOnHover && setIsAnimating(true)}
            {...props}
        >
            <AnimatePresence>
                {displayText.map((letter, index) => (
                    <motion.span
                        key={index}
                        className={cn("font-mono", letter === " " ? "w-3" : "")}
                    >
                        {letter ? letter.toUpperCase() : ""}
                    </motion.span>
                ))}
            </AnimatePresence>

        </MotionComponent>
    );
}
