module Model exposing (Model, default)

import ElmAnalyse


type alias Model =
    { projectPath : String
    , analyses : List ElmAnalyse.Message
    }


default : Model
default =
    { projectPath = ""
    , analyses = []
    }
