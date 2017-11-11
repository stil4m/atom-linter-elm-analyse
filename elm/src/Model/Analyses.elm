module Model.Analyses exposing (process)

import ElmAnalyse
import Json.Encode exposing (Value)


type alias WithAnalyses record =
    { record
        | analyses : List ElmAnalyse.Message
    }


process : Value -> WithAnalyses model -> WithAnalyses model
process rawJson model =
    { model | analyses = ElmAnalyse.decode rawJson }
