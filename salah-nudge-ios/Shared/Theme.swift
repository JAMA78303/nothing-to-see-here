import SwiftUI
import UIKit

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
                  blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
    }
}

extension Color {
    init(light: UInt32, dark: UInt32) {
        self.init(UIColor { $0.userInterfaceStyle == .dark ? UIColor(hex: dark) : UIColor(hex: light) })
    }
}

/// Same palette as the web app.
enum Palette {
    static let bg = Color(light: 0xEBF0EE, dark: 0x0D1517)
    static let surface = Color(light: 0xF8FAF9, dark: 0x142024)
    static let ink = Color(light: 0x13211E, dark: 0xE2EBE8)
    static let muted = Color(light: 0x586A65, dark: 0x8C9E99)
    static let line = Color(light: 0xD0DAD6, dark: 0x24353A)
    static let accent = Color(light: 0x1E4E5E, dark: 0x82BCCD)
    static let ok = Color(light: 0x23824F, dark: 0x4CC387)
    static let okSoft = Color(light: 0xD8EEE1, dark: 0x173A29)
    static let warn = Color(light: 0xB98207, dark: 0xEDB73A)
    static let warnSoft = Color(light: 0xF7EBC9, dark: 0x3D3114)
    static let late = Color(light: 0xBF3A2A, dark: 0xF06C57)
    static let lateSoft = Color(light: 0xF8DCD6, dark: 0x431C17)
    static let idleSoft = Color(light: 0xDEE6EA, dark: 0x1B2B31)
}

extension Level {
    var tone: Color {
        switch self {
        case .ok: Palette.ok
        case .warn: Palette.warn
        case .late: Palette.late
        case .done, .idle: Palette.accent
        }
    }

    var soft: Color {
        switch self {
        case .ok: Palette.okSoft
        case .warn: Palette.warnSoft
        case .late: Palette.lateSoft
        case .done, .idle: Palette.idleSoft
        }
    }
}

/// A mihrab-style arch: half-ellipse top, softly rounded bottom corners.
struct ArchShape: Shape {
    var bottomRadius: CGFloat = 20

    func path(in r: CGRect) -> Path {
        let archHeight = min(r.width / 2, r.height * 0.45)
        let k: CGFloat = 0.5523 // bezier approximation of a quarter ellipse
        let c = bottomRadius
        var p = Path()
        p.move(to: CGPoint(x: r.minX, y: r.minY + archHeight))
        p.addCurve(to: CGPoint(x: r.midX, y: r.minY),
                   control1: CGPoint(x: r.minX, y: r.minY + archHeight * (1 - k)),
                   control2: CGPoint(x: r.midX - r.width / 2 * k, y: r.minY))
        p.addCurve(to: CGPoint(x: r.maxX, y: r.minY + archHeight),
                   control1: CGPoint(x: r.midX + r.width / 2 * k, y: r.minY),
                   control2: CGPoint(x: r.maxX, y: r.minY + archHeight * (1 - k)))
        p.addLine(to: CGPoint(x: r.maxX, y: r.maxY - c))
        p.addQuadCurve(to: CGPoint(x: r.maxX - c, y: r.maxY), control: CGPoint(x: r.maxX, y: r.maxY))
        p.addLine(to: CGPoint(x: r.minX + c, y: r.maxY))
        p.addQuadCurve(to: CGPoint(x: r.minX, y: r.maxY - c), control: CGPoint(x: r.minX, y: r.maxY))
        p.closeSubpath()
        return p
    }
}
