import { useEffect, useState } from "react"
import HomeScreen from "~screens/HomeScreen"
import CreateFormScreen from "~screens/CreateFormScreen"
import FormListScreen from "~screens/FormListScreen"
import DemoScreen from "~screens/DemoScreen"
import { StorageService } from "~services/storage"
import type { Screen, Form } from "~types"
import "~styles/global.css"

function IndexPopup() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home')
  const [forms, setForms] = useState<Form[]>([])
  const [selectedFormId, setSelectedFormId] = useState<string | undefined>()

  useEffect(() => {
    initializeAndLoadForms()
  }, [])

  const initializeAndLoadForms = async () => {
    await StorageService.initializeMockData()
    await loadForms()
  }

  const loadForms = async () => {
    const loadedForms = await StorageService.getForms()
    setForms(loadedForms)
  }

  const handleNavigate = (screen: string, formId?: string) => {
    setCurrentScreen(screen as Screen)
    if (formId) {
      setSelectedFormId(formId)
    }
  }

  const handleCreateForm = async (formName: string) => {
    await StorageService.addForm({ name: formName })
    await loadForms()
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen onNavigate={handleNavigate} />
      case 'create-form':
        return (
          <CreateFormScreen
            onNavigate={handleNavigate}
            onCreateForm={handleCreateForm}
          />
        )
      case 'form-list':
        return <FormListScreen forms={forms} onNavigate={handleNavigate} allForms={forms} />
      case 'demo':
        return <DemoScreen formId={selectedFormId} onNavigate={handleNavigate} />
      default:
        return <HomeScreen onNavigate={handleNavigate} />
    }
  }

  return renderScreen()
}

export default IndexPopup
