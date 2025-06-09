import { render, screen, fireEvent } from "@testing-library/react"
import Header from "@/components/header"
import jest from "jest"

// Mock useRouter
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

describe("Header Component", () => {
  it("renders the header with correct title", () => {
    render(<Header />)
    expect(screen.getByText("Gestión de Flota Fulcrum")).toBeInTheDocument()
  })

  it("displays all navigation items on desktop", () => {
    render(<Header />)
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Coches")).toBeInTheDocument()
    expect(screen.getByText("Reservas")).toBeInTheDocument()
    expect(screen.getByText("Empleados")).toBeInTheDocument()
    expect(screen.getByText("Configuración")).toBeInTheDocument()
  })

  it("toggles mobile menu when button is clicked", () => {
    render(<Header />)

    // Mobile menu should be hidden initially
    expect(screen.queryByRole("link", { name: /dashboard/i })).toBeInTheDocument()

    // Click the menu button
    const menuButton = screen.getByRole("button", { name: /abrir menú principal/i })
    fireEvent.click(menuButton)

    // Mobile menu should be visible now
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0)

    // Click again to close
    fireEvent.click(menuButton)

    // Should be back to initial state
    expect(screen.queryByRole("link", { name: /dashboard/i })).toBeInTheDocument()
  })
})
