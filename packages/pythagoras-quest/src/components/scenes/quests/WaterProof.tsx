import React, { useRef, useEffect, useState, useCallback } from "react";
import type { ViewState, Point, Colors } from "./types";
import { useTranslations } from "../../../hooks/useTranslations";
import { announceToScreenReader } from "@k8-games/sdk";

interface WaterProofProps {
    translations: any;
    currentA: number;
    currentB: number;
    onSliderChange: (type: "a" | "b", value: string) => void;
    onPour: (source: "a" | "b") => void;
    onReset: () => void;
    pouredA: boolean;
    pouredB: boolean;
    pouredBFirst: boolean;
}

const WaterProof: React.FC<WaterProofProps> = ({
    translations: _translations,
    currentA,
    currentB,
    onSliderChange,
    onPour,
    onReset,
    pouredA,
    pouredB,
    pouredBFirst,
}) => {
    const { t } = useTranslations();
    const svgRef = useRef<SVGSVGElement>(null);
    const viewStateRef = useRef<ViewState>({
        viewBox: { x: 0, y: 0, width: 800, height: 800 },
        isPanning: false,
        startPoint: { x: 0, y: 0 },
    });

    const [localPouredA, setLocalPouredA] = useState<boolean>(pouredA);
    const [localPouredB, setLocalPouredB] = useState<boolean>(pouredB);

    useEffect(() => {
        setLocalPouredA(pouredA);
    }, [pouredA]);

    useEffect(() => {
        setLocalPouredB(pouredB);
    }, [pouredB]);

    useEffect(() => {
        if (!localPouredA && !localPouredB) {
            resetWater();
        }
    }, [localPouredA, localPouredB]);

    // If both pours have been completed and the slider value changes, auto-reset
    const prevARef = useRef<number>(currentA);
    const prevBRef = useRef<number>(currentB);
    useEffect(() => {
        const prevA = prevARef.current;
        const prevB = prevBRef.current;

        // Only trigger reset when both pours have happened (local state mirrors props)
        if ((currentA !== prevA || currentB !== prevB) && localPouredA && localPouredB) {
            // call onReset to clear parent state and visuals
            onReset();
            // clear local poured flags immediately to keep UI consistent
            setLocalPouredA(false);
            setLocalPouredB(false);
        }

        prevARef.current = currentA;
        prevBRef.current = currentB;
    }, [currentA, currentB, localPouredA, localPouredB, onReset]);

    const [emptySquareState, setEmptySquareState] = useState<{
        a: boolean;
        b: boolean;
        c: boolean;
    }>({
        a: false,
        b: false,
        c: true,
    });

    // Constants
    const COLORS: Colors = { a: "#C62726", b: "#1A53EB", c: "#207221" };

    // Helper function to calculate hypotenuse with proper formatting
    const calculateHypotenuse = (a: number, b: number): string => {
        const c = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
        return c.toFixed(2);
    };

    const updateSVGViewBox = () => {
        const svg = svgRef.current;
        if (!svg) return;
        const vb = viewStateRef.current.viewBox;
        svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
    };

    const getSVGEventPoint = (evt: MouseEvent | TouchEvent): Point => {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0 };
        const point = svg.createSVGPoint();
        if ("touches" in evt) {
            point.x = evt.touches[0].clientX;
            point.y = evt.touches[0].clientY;
        } else {
            point.x = evt.clientX;
            point.y = evt.clientY;
        }
        const ctm = svg.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        return point.matrixTransform(ctm.inverse());
    };

    const handleSVGPointerDown = (evt: React.MouseEvent<HTMLDivElement>) => {
        evt.stopPropagation();
        viewStateRef.current.isPanning = true;
        viewStateRef.current.startPoint = getSVGEventPoint(evt.nativeEvent);
    };

    const handleSVGPointerMove = (evt: React.MouseEvent<HTMLDivElement>) => {
        evt.stopPropagation();
        if (!viewStateRef.current.isPanning) return;
        const endPoint = getSVGEventPoint(evt.nativeEvent);
        const dx = endPoint.x - viewStateRef.current.startPoint.x;
        const dy = endPoint.y - viewStateRef.current.startPoint.y;

        viewStateRef.current.viewBox.x -= dx;
        viewStateRef.current.viewBox.y -= dy;
        updateSVGViewBox();
    };

    const handleSVGPointerUp = (evt: React.MouseEvent<HTMLDivElement>) => {
        evt.stopPropagation();
        viewStateRef.current.isPanning = false;
    };

    const handleSVGWheel = (evt: React.WheelEvent<HTMLDivElement>) => {
        evt.stopPropagation();
    };

    const handleKeyDown = useCallback((evt: React.KeyboardEvent<HTMLDivElement>) => {
        const step = 20; // pixels to move per key press
        let moved = false;

        switch (evt.key) {
            case 'ArrowUp':
                evt.preventDefault();
                viewStateRef.current.viewBox.y += step;
                moved = true;
                break;
            case 'ArrowDown':
                evt.preventDefault();
                viewStateRef.current.viewBox.y -= step;
                moved = true;
                break;
            case 'ArrowLeft':
                evt.preventDefault();
                viewStateRef.current.viewBox.x += step;
                moved = true;
                break;
            case 'ArrowRight':
                evt.preventDefault();
                viewStateRef.current.viewBox.x -= step;
                moved = true;
                break;
        }

        if (moved) {
            updateSVGViewBox();
        }
    }, []);

    const createSquare = (
        id: string,
        size: number,
        color: string,
        area: string,
        addLabel: boolean = true
    ) => {
        const group = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
        );

        const rect = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "rect"
        );
        rect.setAttribute("width", size.toString());
        rect.setAttribute("height", size.toString());
        rect.setAttribute("stroke", color);
        rect.setAttribute("stroke-width", "2");
        rect.setAttribute("fill", "transparent");
        rect.setAttribute("opacity", "0.8");
        group.appendChild(rect);

        if (id === "c") {
            const waterFromA = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "rect"
            );
            waterFromA.id = "water-c-from-a";
            waterFromA.setAttribute("width", size.toString());
            waterFromA.setAttribute("fill", COLORS.a);
            waterFromA.setAttribute("height", "0");
            waterFromA.setAttribute("y", size.toString());
            waterFromA.style.transition =
                "height 3s cubic-bezier(0.65, 0, 0.35, 1), y 3s cubic-bezier(0.65, 0, 0.35, 1)";
            group.appendChild(waterFromA);

            const waterFromB = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "rect"
            );
            waterFromB.id = "water-c-from-b";
            waterFromB.setAttribute("width", size.toString());
            waterFromB.setAttribute("fill", COLORS.b);
            waterFromB.setAttribute("height", "0");
            waterFromB.setAttribute("y", size.toString());
            waterFromB.style.transition =
                "height 3s cubic-bezier(0.65, 0, 0.35, 1), y 3s cubic-bezier(0.65, 0, 0.35, 1)";
            group.appendChild(waterFromB);
        } else {
            const water = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "rect"
            );
            water.id = `water-${id}`;
            water.setAttribute("width", size.toString());
            water.setAttribute("fill", color);
            water.style.transition =
                "height 3s cubic-bezier(0.65, 0, 0.35, 1), y 3s cubic-bezier(0.65, 0, 0.35, 1)";
            
            // Set initial water level based on emptySquareState
            const isSquareEmpty =
                emptySquareState[id as keyof typeof emptySquareState];
            if (isSquareEmpty) {
                water.setAttribute("height", "0");
                water.setAttribute("y", size.toString());
            } else {
                water.setAttribute("height", size.toString());
                water.setAttribute("y", "0");
            }
            
            group.appendChild(water);
        }

        if (addLabel) {
            const label = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text"
            );
            label.id = `text-${id}-label`;
            label.setAttribute("x", (size / 2).toString());
            label.setAttribute("y", (size / 2).toString());
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("dominant-baseline", "middle");
            label.setAttribute("font-weight", "700");
            label.setAttribute("font-size", "clamp(1.2rem, 4.5vw, 1.7rem)");

            // Set text color based on emptySquareState
            label.setAttribute("fill", "#FFFFFF");

            const tspan1 = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "tspan"
            );
            tspan1.textContent = `${id}² = `;

            const tspan2 = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "tspan"
            );
            tspan2.setAttribute("font-weight", "700");
            tspan2.textContent = area;

            label.appendChild(tspan1);
            label.appendChild(tspan2);

            group.appendChild(label);
        }
        return group;
    };

    const drawProof = useCallback(() => {
        const svg = svgRef.current;
        if (!svg) return;

        svg.innerHTML = "";

        const { a, b } = { a: currentA, b: currentB };
        const c = Math.sqrt(a * a + b * b);

        // Add drop shadow filter
        const defs = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "defs"
        );
        const filter = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "filter"
        );
        filter.id = "drop-shadow";
        filter.setAttribute("x", "-20%");
        filter.setAttribute("y", "-20%");
        filter.setAttribute("width", "140%");
        filter.setAttribute("height", "140%");
        const feDropShadow = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "feDropShadow"
        );
        feDropShadow.setAttribute("dx", "1");
        feDropShadow.setAttribute("dy", "1");
        feDropShadow.setAttribute("stdDeviation", "2");
        feDropShadow.setAttribute("flood-color", "#000000");
        feDropShadow.setAttribute("flood-opacity", "0.5");
        filter.appendChild(feDropShadow);
        defs.appendChild(filter);
        svg.appendChild(defs);

        // Scaling and positioning
        const maxDimension = c + (a * b) / c;
        const scale = (800 * 0.5) / maxDimension;
        const scaledA = a * scale;
        const scaledB = b * scale;
        const scaledC = c * scale;

        const centerX = 400;
        const centerY = 400;

        const apparatusGroup = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
        );
        apparatusGroup.id = "apparatus";

        // Define Triangle vertices
        const p1 = { x: centerX - scaledC / 2, y: centerY };
        const p2 = { x: centerX + scaledC / 2, y: centerY };
        const altitude = (scaledA * scaledB) / scaledC;
        const xOffset = Math.sqrt(scaledB * scaledB - altitude * altitude);
        const p3 = { x: p1.x + xOffset, y: p1.y - altitude };

        // Draw Squares
        const cAreaStr =
            (c * c) % 1 === 0
                ? (c * c).toString()
                : `${(c * c).toPrecision(3)}...`;

        const squareC = createSquare("c", scaledC, COLORS.c, cAreaStr);
        squareC.setAttribute("transform", `translate(${p1.x}, ${p1.y})`);
        apparatusGroup.appendChild(squareC);

        const angleA = Math.atan2(p3.y - p2.y, p3.x - p2.x) * (180 / Math.PI);
        const squareA = createSquare(
            "a",
            scaledA,
            COLORS.a,
            (a * a).toString(),
            !(a < 3 && b >= 3)
        );
        squareA.setAttribute(
            "transform",
            `translate(${p2.x}, ${p2.y}) rotate(${angleA})`
        );

        // Rotate the text in square A to mirror square B's text orientation
        const textLabelA = squareA.querySelector(
            "#text-a-label"
        ) as SVGTextElement;
        if (textLabelA) {
            // Mirror the rotation to make text readable (opposite direction from square B)
            const textX = scaledA / 2;
            const textY = scaledA / 2;
            textLabelA.setAttribute(
                "transform",
                `rotate(${-angleA}, ${textX}, ${textY})`
            );
        }

        apparatusGroup.appendChild(squareA);

        if (a < 3 && b >= 3) {
            // Create text label for A outside, to the right
            const textLabelAOutside = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text"
            );
            textLabelAOutside.id = "text-a-label";
            textLabelAOutside.setAttribute("x", (centerX + 260).toString());
            textLabelAOutside.setAttribute("y", (centerY + -30).toString());
            textLabelAOutside.setAttribute("text-anchor", "start");
            textLabelAOutside.setAttribute("dominant-baseline", "middle");
            textLabelAOutside.setAttribute("font-weight", "700");
            textLabelAOutside.setAttribute("font-size", "clamp(1.2rem, 4.5vw, 1.7rem)");
            textLabelAOutside.setAttribute("fill", "#FFFFFF");

            const tspan1A = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "tspan"
            );
            tspan1A.textContent = `a² = `;

            const tspan2A = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "tspan"
            );
            tspan2A.setAttribute("font-weight", "700");
            tspan2A.textContent = (a * a).toString();

            textLabelAOutside.appendChild(tspan1A);
            textLabelAOutside.appendChild(tspan2A);

            apparatusGroup.appendChild(textLabelAOutside);
        }

        const angleB = Math.atan2(p3.y - p1.y, p3.x - p1.x) * (180 / Math.PI);
        const squareB = createSquare(
            "b",
            scaledB,
            COLORS.b,
            (b * b).toString(),
            !(b < 3 && a >= 3)
        );
        squareB.setAttribute(
            "transform",
            `translate(${p1.x}, ${p1.y}) rotate(${angleB}) translate(0, -${scaledB})`
        );

        // Counter-rotate the text inside square B to keep it upright (same as square A)
        const textLabelB = squareB.querySelector(
            "#text-b-label"
        ) as SVGTextElement;
        if (textLabelB) {
            const textX = scaledB / 2;
            const textY = scaledB / 2;
            textLabelB.setAttribute(
                "transform",
                `rotate(${-angleB}, ${textX}, ${textY})`
            );
        }

        apparatusGroup.appendChild(squareB);

        if (b < 3 && a >= 3) {
            // Create text label for B outside, to the left
            const textLabelBOutside = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text"
            );
            textLabelBOutside.id = "text-b-label";
            textLabelBOutside.setAttribute("x", (centerX - 260).toString());
            textLabelBOutside.setAttribute("y", (centerY + -60).toString());
            textLabelBOutside.setAttribute("text-anchor", "end");
            textLabelBOutside.setAttribute("dominant-baseline", "middle");
            textLabelBOutside.setAttribute("font-weight", "700");
            textLabelBOutside.setAttribute("font-size", "clamp(1.2rem, 4.5vw, 1.7rem)");
            textLabelBOutside.setAttribute("fill", "#FFFFFF");

            const tspan1B = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "tspan"
            );
            tspan1B.textContent = `b² = `;

            const tspan2B = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "tspan"
            );
            tspan2B.setAttribute("font-weight", "700");
            tspan2B.textContent = (b * b).toString();

            textLabelBOutside.appendChild(tspan1B);
            textLabelBOutside.appendChild(tspan2B);

            apparatusGroup.appendChild(textLabelBOutside);
        }

        // Draw Triangle lines
        const lineA = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
        );
        lineA.setAttribute("x1", p2.x.toString());
        lineA.setAttribute("y1", p2.y.toString());
        lineA.setAttribute("x2", p3.x.toString());
        lineA.setAttribute("y2", p3.y.toString());
        lineA.setAttribute("stroke", COLORS.a);
        lineA.setAttribute("stroke-width", "4");
        apparatusGroup.appendChild(lineA);

        const lineB = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
        );
        lineB.setAttribute("x1", p1.x.toString());
        lineB.setAttribute("y1", p1.y.toString());
        lineB.setAttribute("x2", p3.x.toString());
        lineB.setAttribute("y2", p3.y.toString());
        lineB.setAttribute("stroke", COLORS.b);
        lineB.setAttribute("stroke-width", "4");
        apparatusGroup.appendChild(lineB);

        const lineC = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
        );
        lineC.setAttribute("x1", p1.x.toString());
        lineC.setAttribute("y1", p1.y.toString());
        lineC.setAttribute("x2", p2.x.toString());
        lineC.setAttribute("y2", p2.y.toString());
        lineC.setAttribute("stroke", COLORS.c);
        lineC.setAttribute("stroke-width", "4");
        apparatusGroup.appendChild(lineC);

        svg.appendChild(apparatusGroup);
    }, [currentA, currentB]);

    const resetWater = () => {
        setEmptySquareState({ a: false, b: false, c: true });

        ["a", "b"].forEach((id) => {
            const water = document.getElementById(
                `water-${id}`
            ) as unknown as SVGElement;
            if (water) {
                const size = (
                    water as unknown as {
                        width: { baseVal: { value: number } };
                    }
                ).width.baseVal.value;
                water.setAttribute("height", size.toString());
                water.setAttribute("y", "0");
            }
            // Reset text colors to white (filled state)
            const textLabel = document.getElementById(
                `text-${id}-label`
            ) as unknown as SVGTextElement;
            if (textLabel) {
                textLabel.setAttribute("fill", "#FFFFFF");
            }
        });

        ["water-c-from-a", "water-c-from-b"].forEach((id) => {
            const water = document.getElementById(id) as unknown as SVGElement;
            if (water) {
                const size = (
                    water as unknown as {
                        width: { baseVal: { value: number } };
                    }
                ).width.baseVal.value;
                water.setAttribute("height", "0");
                water.setAttribute("y", size.toString());
            }
        });

        // Reset C text color to green (empty state)
        const textLabelC = document.getElementById(
            "text-c-label"
        ) as unknown as SVGTextElement;
        if (textLabelC) {
            textLabelC.setAttribute("fill", "#FFFFFF");
        }
        
        // Announce reset to screen reader
        announceToScreenReader(t("waterProof.resetAnnouncement"));
    };

    const pour = (source: "a" | "b") => {
        const pourAction = (id: "a" | "b", waterElement: SVGElement) => {
            const squareSize = (
                waterElement as unknown as {
                    width: { baseVal: { value: number } };
                }
            ).width.baseVal.value;

            // Force reflow before animation
            waterElement.getBoundingClientRect();

            requestAnimationFrame(() => {
                waterElement.style.transition = "height 3s cubic-bezier(0.65, 0, 0.35, 1), y 3s cubic-bezier(0.65, 0, 0.35, 1)";
                waterElement.setAttribute("height", "0");
                waterElement.setAttribute("y", squareSize.toString());

                if (id === "a") {
                    setLocalPouredA(true);
                    onPour("a");
                    setEmptySquareState((prev) => ({ ...prev, a: true, c: false }));
                    const textLabelA = document.getElementById("text-a-label") as unknown as SVGTextElement;
                    if (textLabelA) textLabelA.setAttribute("fill", "#FFFFFF");
                    // Announce to screen reader
                    const announcement = t("waterProof.pourAAnnouncement")
                        .replace("{aSquared}", (currentA * currentA).toString());
                    announceToScreenReader(announcement);
                } else {
                    setLocalPouredB(true);
                    onPour("b");
                    setEmptySquareState((prev) => ({ ...prev, b: true, c: false }));
                    const textLabelB = document.getElementById("text-b-label") as unknown as SVGTextElement;
                    if (textLabelB) textLabelB.setAttribute("fill", "#FFFFFF");
                    // Announce to screen reader
                    const announcement = t("waterProof.pourBAnnouncement")
                        .replace("{bSquared}", (currentB * currentB).toString());
                    announceToScreenReader(announcement);
                }

                const textLabelC = document.getElementById("text-c-label") as unknown as SVGTextElement;
                if (textLabelC) {
                    textLabelC.setAttribute("fill", "#FFFFFF");
                }
            });
        };

        if (source === "a" && !localPouredA) {
            const waterA = document.getElementById("water-a") as unknown as SVGElement;
            if (waterA) pourAction("a", waterA);
        }

        if (source === "b" && !localPouredB) {
            const waterB = document.getElementById("water-b") as unknown as SVGElement;
            if (waterB) pourAction("b", waterB);
        }
    };

    useEffect(() => {
        drawProof();
        updateSVGViewBox();
    }, [drawProof]);

    useEffect(() => {
        if (localPouredA || localPouredB) {
            const { a, b } = { a: currentA, b: currentB };
            const c = Math.sqrt(a * a + b * b);
            const cSq = c * c;

            const waterCfromA = document.getElementById(
                "water-c-from-a"
            ) as unknown as SVGElement;
            const waterCfromB = document.getElementById(
                "water-c-from-b"
            ) as unknown as SVGElement;
            if (!waterCfromA || !waterCfromB) return;

            // Force reflow
            waterCfromA.getBoundingClientRect();
            waterCfromB.getBoundingClientRect();

            const scaledC = (
                waterCfromA as unknown as {
                    width: { baseVal: { value: number } };
                }
            ).width.baseVal.value;

            const heightA = localPouredA ? ((a * a) / cSq) * scaledC : 0;
            const heightB = localPouredB ? ((b * b) / cSq) * scaledC : 0;

            requestAnimationFrame(() => {
                // Position water based on pour order
                if (pouredBFirst) {
                    if (localPouredB && !localPouredA) { // Pouring B first
                        waterCfromB.style.transition = "height 3s cubic-bezier(0.65, 0, 0.35, 1), y 3s cubic-bezier(0.65, 0, 0.35, 1)";
                        waterCfromB.setAttribute("height", heightB.toString());
                        waterCfromB.setAttribute("y", (scaledC - heightB).toString());
                    } else if (localPouredA) { // Then pouring A
                        waterCfromA.style.transition = "height 3s cubic-bezier(0.65, 0, 0.35, 1), y 3s cubic-bezier(0.65, 0, 0.35, 1)";
                        waterCfromA.setAttribute("height", heightA.toString());
                        waterCfromA.setAttribute("y", (scaledC - heightB - heightA).toString());
                    }
                } else {
                    if (localPouredA && !localPouredB) { // Pouring A first
                        waterCfromA.style.transition = "height 3s cubic-bezier(0.65, 0, 0.35, 1), y 3s cubic-bezier(0.65, 0, 0.35, 1)";
                        waterCfromA.setAttribute("height", heightA.toString());
                        waterCfromA.setAttribute("y", (scaledC - heightA).toString());
                    } else if (localPouredB) { // Then pouring B
                        waterCfromB.style.transition = "height 3s cubic-bezier(0.65, 0, 0.35, 1), y 3s cubic-bezier(0.65, 0, 0.35, 1)";
                        waterCfromB.setAttribute("height", heightB.toString());
                        waterCfromB.setAttribute("y", (scaledC - heightA - heightB).toString());
                    }
                }
            });
        }
    }, [localPouredA, localPouredB, currentA, currentB, pouredBFirst]);

    return (
        <div className="absolute top-4 left-4 right-4 bottom-4 bg-[#1F1816] overflow-hidden">
            <div className="h-full flex flex-col p-4">
            {/* Controls Section - Fixed Height */}
            <div className="flex-shrink-0 p-4">
                <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
                    <div className="flex flex-1 gap-4 flex-row">
                        <div className="w-full">
                            <label
                                htmlFor="a-slider"
                                className="block font-bold text-white bg-[#901110] px-3 py-1 rounded-md inline-block mb-2"
                            >
                                a = {currentA}
                            </label>
                            <div className="relative">
                                <input
                                    id="a-slider"
                                    type="range"
                                    min="1"
                                    max="20"
                                    value={currentA}
                                    onChange={(e) =>
                                        onSliderChange("a", e.target.value)
                                    }
                                    className="a-slider w-full"
                                    style={{
                                        background: `linear-gradient(to right, #FF0200 ${
                                            ((currentA - 1) / (20 - 1)) * 100
                                        }%, #666666 ${
                                            ((currentA - 1) / (20 - 1)) * 100
                                        }%)`,
                                    }}
                                    aria-label={t("waterProof.aSliderLabel")}
                                />
                            </div>
                        </div>
                        <div className="w-full">
                            <label
                                htmlFor="b-slider"
                                className="block font-bold text-white bg-[#0534B2] px-3 py-1 rounded-md inline-block mb-2"
                            >
                                b = {currentB}
                            </label>
                            <div className="relative">
                                <input
                                    id="b-slider"
                                    type="range"
                                    min="1"
                                    max="20"
                                    value={currentB}
                                    onChange={(e) =>
                                        onSliderChange("b", e.target.value)
                                    }
                                    className="b-slider w-full"
                                    style={{
                                        background: `linear-gradient(to right, #0046FF ${
                                            ((currentB - 1) / (20 - 1)) * 100
                                        }%, #666666 ${
                                            ((currentB - 1) / (20 - 1)) * 100
                                        }%)`,
                                    }}
                                    aria-label={t("waterProof.bSliderLabel")}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Buttons */}
                <ul className="flex gap-3 mt-4 list-none p-0 m-0">
                    <li className="flex-1">
                        <button
                            onClick={() => pour("a")}
                            disabled={localPouredA}
                            className="w-full px-4 py-3 rounded transition-all text-center text-white font-semibold bg-no-repeat bg-cover bg-center disabled:bg-no-repeat disabled:bg-cover disabled:bg-center hover:bg-no-repeat hover:bg-cover hover:bg-center active:bg-no-repeat active:bg-cover active:bg-center"
                            style={{
                                backgroundImage: localPouredA
                                    ? "url('assets/buttons/wider_disabled.png')"
                                    : "url('assets/buttons/wider_default.png')",
                            }}
                            onMouseEnter={(e) => {
                                if (!localPouredA) {
                                    e.currentTarget.style.backgroundImage =
                                        "url('assets/buttons/wider_hover.png')";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!localPouredA) {
                                    e.currentTarget.style.backgroundImage =
                                        "url('assets/buttons/wider_default.png')";
                                }
                            }}
                            onMouseDown={(e) => {
                                if (!localPouredA) {
                                    e.currentTarget.style.backgroundImage =
                                        "url('assets/buttons/wider_pressed.png')";
                                }
                            }}
                            onMouseUp={(e) => {
                                if (!localPouredA) {
                                    e.currentTarget.style.backgroundImage =
                                        "url('assets/buttons/wider_default.png')";
                                }
                            }}
                        >
                            {t("waterProof.pourA")}
                        </button>
                    </li>
                    <li className="flex-1">
                        <button
                            onClick={() => pour("b")}
                            disabled={localPouredB}
                            className="w-full px-4 py-3 rounded transition-all text-center text-white font-semibold bg-no-repeat bg-cover bg-center disabled:bg-no-repeat disabled:bg-cover disabled:bg-center hover:bg-no-repeat hover:bg-cover hover:bg-center active:bg-no-repeat active:bg-cover active:bg-center"
                            style={{
                                backgroundImage: localPouredB
                                    ? "url('assets/buttons/wider_disabled.png')"
                                    : "url('assets/buttons/wider_default.png')",
                            }}
                            onMouseEnter={(e) => {
                                if (!localPouredB) {
                                    e.currentTarget.style.backgroundImage =
                                        "url('assets/buttons/wider_hover.png')";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!localPouredB) {
                                    e.currentTarget.style.backgroundImage =
                                        "url('assets/buttons/wider_default.png')";
                                }
                            }}
                            onMouseDown={(e) => {
                                if (!localPouredB) {
                                    e.currentTarget.style.backgroundImage =
                                        "url('assets/buttons/wider_pressed.png')";
                                }
                            }}
                            onMouseUp={(e) => {
                                if (!localPouredB) {
                                    e.currentTarget.style.backgroundImage =
                                        "url('assets/buttons/wider_default.png')";
                                }
                            }}
                        >
                            {t("waterProof.pourB")}
                        </button>
                    </li>
                    <li className="flex-1">
                        <button
                            onClick={onReset}
                            className="w-full px-4 py-3 rounded transition-all text-center text-blue-600 font-semibold bg-no-repeat bg-cover bg-center hover:bg-no-repeat hover:bg-cover hover:bg-center active:bg-no-repeat active:bg-cover active:bg-center"
                            style={{
                                backgroundImage:
                                    "url('assets/buttons/wider_default.png')",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundImage =
                                    "url('assets/buttons/wider_hover.png')";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundImage =
                                    "url('assets/buttons/wider_default.png')";
                            }}
                            onMouseDown={(e) => {
                                e.currentTarget.style.backgroundImage =
                                    "url('assets/buttons/wider_pressed.png')";
                            }}
                            onMouseUp={(e) => {
                                e.currentTarget.style.backgroundImage =
                                    "url('assets/buttons/wider_default.png')";
                            }}
                        >
                            {t("waterProof.reset")}
                        </button>
                    </li>
                </ul>
            </div>

            {/* Visualization Section - Equal Height */}
            <div className="flex-1 mx-0 mb-2 bg-black rounded-lg relative flex items-center justify-center">
                {/* C Label - Top Right */}
                <div className="absolute top-4 right-4 font-bold text-white bg-[#006301] px-3 py-1 rounded-md z-10">
                    c = {calculateHypotenuse(currentA, currentB)}
                </div>
                <div
                    className="cursor-grab active:cursor-grabbing overflow-hidden"
                    style={{ width: "500px", height: "500px", aspectRatio: "1 / 1", touchAction: "none" }}
                    onMouseDown={handleSVGPointerDown}
                    onMouseMove={handleSVGPointerMove}
                    onMouseUp={handleSVGPointerUp}
                    onMouseLeave={handleSVGPointerUp}
                    onWheel={handleSVGWheel}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                    aria-label={
                        emptySquareState.c
                            ? t("waterProof.visualizationInitial")
                                  .replace(
                                      "{aSquared}",
                                      (currentA * currentA).toString()
                                  )
                                  .replace(
                                      "{bSquared}",
                                      (currentB * currentB).toString()
                                  )
                                  .replace(
                                      "{cSquared}",
                                      Math.round(
                                          currentA * currentA + currentB * currentB
                                      ).toString()
                                  )
                            : !emptySquareState.a && emptySquareState.b
                            ? t("waterProof.visualizationPouringB").replace(
                                  "{bSquared}",
                                  (currentB * currentB).toString()
                              )
                            : emptySquareState.a && !emptySquareState.b
                            ? t("waterProof.visualizationPouringA").replace(
                                  "{aSquared}",
                                  (currentA * currentA).toString()
                              )
                            : t("waterProof.visualizationCompleted").replace(
                                  "{cSquared}",
                                  Math.round(
                                      currentA * currentA + currentB * currentB
                                  ).toString()
                              )
                    }
                    role="img"
                >
                    <svg
                        ref={svgRef}
                        aria-hidden="true"
                        width="100%"
                        height="100%"
                    ></svg>
                </div>
            </div>
        </div>
        </div>
    );
};

export default WaterProof;
