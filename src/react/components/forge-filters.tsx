/**
 * The two turbulence filters the forge borrows.
 *
 * They live once in the shell because a filter is referenced by id: the flame under the open tab
 * and the heat shimmer around a portrait both point at these.
 */
export function ForgeFilters() {
    return (
        <svg className="visually-hidden" width="0" height="0" aria-hidden="true" focusable="false">
            <defs>
                <filter id="forge-flame" x="-6%" y="-8%" width="112%" height="116%" colorInterpolationFilters="sRGB">
                    <feTurbulence type="fractalNoise" baseFrequency="0.03 0.07" numOctaves="2" seed="7" result="noise">
                        <animate
                            attributeName="baseFrequency"
                            dur="6s"
                            values="0.03 0.07; 0.05 0.1; 0.03 0.07"
                            repeatCount="indefinite"
                        />
                    </feTurbulence>
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="noise"
                        scale="4"
                        xChannelSelector="R"
                        yChannelSelector="G"
                    />
                </filter>

                <filter id="forge-haze" x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.011 0.026"
                        numOctaves="2"
                        seed="11"
                        result="heat"
                    >
                        <animate
                            attributeName="baseFrequency"
                            dur="12s"
                            values="0.011 0.026; 0.019 0.042; 0.011 0.026"
                            repeatCount="indefinite"
                        />
                    </feTurbulence>
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="heat"
                        scale="12"
                        xChannelSelector="R"
                        yChannelSelector="G"
                    />
                </filter>
            </defs>
        </svg>
    );
}
